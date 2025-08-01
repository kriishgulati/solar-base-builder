import { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useShapeStore, Shape } from '@/stores/shapeStore';
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';

const PIXELS_PER_METER = 50; // 1 meter = 50 pixels for display

export const SimpleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragShape, setDragShape] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDraggingEndpoint, setIsDraggingEndpoint] = useState<'start' | 'end' | null>(null);

  const {
    shapes,
    selectedShapeId,
    selectShape,
    updateShape,
    deleteShape,
    canvasScale,
    setCanvasScale,
    canvasOffset,
    setCanvasOffset,
    shapeMergeEnabled,
  } = useShapeStore();

  const drawShapes = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = 'hsl(var(--border))';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.2;
    
    const gridSize = PIXELS_PER_METER * canvasScale;
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Draw connection lines
    shapes.forEach(shape => {
      shape.connectedTo.forEach(connectedId => {
        const connectedShape = shapes.find(s => s.id === connectedId);
        if (!connectedShape) return;

        ctx.strokeStyle = 'hsl(142 76% 55%)';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        
        const startX = (shape.position.x + (shape.dimensions.width || shape.dimensions.radius || 0) / 2) * PIXELS_PER_METER * canvasScale;
        const startY = (shape.position.y + (shape.dimensions.length || shape.dimensions.radius || 0) / 2) * PIXELS_PER_METER * canvasScale;
        const endX = (connectedShape.position.x + (connectedShape.dimensions.width || connectedShape.dimensions.radius || 0) / 2) * PIXELS_PER_METER * canvasScale;
        const endY = (connectedShape.position.y + (connectedShape.dimensions.length || connectedShape.dimensions.radius || 0) / 2) * PIXELS_PER_METER * canvasScale;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    });

    // Draw shapes
    shapes.forEach(shape => {
      const isSelected = selectedShapeId === shape.id;
      const isMerged = shape.merged;
      
      // Create a combined shape path for merged shapes or enclosed areas
      if (isMerged) {
        ctx.fillStyle = 'hsl(142 76% 55% / 0.8)';
        ctx.strokeStyle = 'hsl(142 76% 55%)';
        ctx.lineWidth = 3;
        
        // Find all shapes that are connected to this one (including transitively)
        const visitedShapes = new Set<string>();
        const getAllConnectedShapes = (shapeId: string): Shape[] => {
          if (visitedShapes.has(shapeId)) return [];
          visitedShapes.add(shapeId);
          
          const currentShape = shapes.find(s => s.id === shapeId);
          if (!currentShape) return [];
          
          let connected = [currentShape];
          currentShape.connectedTo.forEach(connectedId => {
            connected = [...connected, ...getAllConnectedShapes(connectedId)];
          });
          
          return connected;
        };
        
        const allConnectedShapes = getAllConnectedShapes(shape.id);
        
        // Check if we have lines that form an enclosed shape
        const lineShapes = allConnectedShapes.filter(s => s.type === 'line');
        if (lineShapes.length >= 3) {
          // Try to draw filled polygon for enclosed line shapes
          ctx.beginPath();
          
          // Start with the first line
          const firstLine = lineShapes[0];
          ctx.moveTo(
            firstLine.startPoint!.x * PIXELS_PER_METER * canvasScale,
            firstLine.startPoint!.y * PIXELS_PER_METER * canvasScale
          );
          
          // Connect all line endpoints to form a polygon
          lineShapes.forEach(lineShape => {
            ctx.lineTo(
              lineShape.endPoint!.x * PIXELS_PER_METER * canvasScale,
              lineShape.endPoint!.y * PIXELS_PER_METER * canvasScale
            );
          });
          
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // Draw all connected shapes normally
          allConnectedShapes.forEach(connectedShape => {
            ctx.beginPath();
            if (connectedShape.type === 'line') {
              const startX = connectedShape.startPoint!.x * PIXELS_PER_METER * canvasScale;
              const startY = connectedShape.startPoint!.y * PIXELS_PER_METER * canvasScale;
              const endX = connectedShape.endPoint!.x * PIXELS_PER_METER * canvasScale;
              const endY = connectedShape.endPoint!.y * PIXELS_PER_METER * canvasScale;
              
              ctx.moveTo(startX, startY);
              ctx.lineTo(endX, endY);
              ctx.stroke();
            } else {
              const x = connectedShape.position.x * PIXELS_PER_METER * canvasScale;
              const y = connectedShape.position.y * PIXELS_PER_METER * canvasScale;
              
              if (connectedShape.type === 'circle') {
                const radius = (connectedShape.dimensions.radius || 0) * PIXELS_PER_METER * canvasScale;
                ctx.arc(x + radius, y + radius, radius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
              } else {
                const width = (connectedShape.dimensions.width || 0) * PIXELS_PER_METER * canvasScale;
                const height = (connectedShape.dimensions.length || 0) * PIXELS_PER_METER * canvasScale;
                ctx.fillRect(x, y, width, height);
                ctx.strokeRect(x, y, width, height);
              }
            }
          });
        }
      } else {
        // Draw individual shapes
        ctx.fillStyle = isSelected 
          ? 'hsl(35 91% 55%)' 
          : 'hsl(35 91% 55% / 0.8)';
      
        ctx.strokeStyle = isSelected 
          ? 'hsl(213 100% 60%)' 
          : 'hsl(35 91% 55%)';
      
        ctx.lineWidth = isSelected ? 3 : 2;

        if (shape.type === 'line') {
          // Draw line from start to end point
          const startX = shape.startPoint!.x * PIXELS_PER_METER * canvasScale;
          const startY = shape.startPoint!.y * PIXELS_PER_METER * canvasScale;
          const endX = shape.endPoint!.x * PIXELS_PER_METER * canvasScale;
          const endY = shape.endPoint!.y * PIXELS_PER_METER * canvasScale;
        
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        
          // Draw endpoint handles for easier manipulation
          ctx.fillStyle = isSelected ? 'hsl(213 100% 60%)' : 'hsl(35 91% 55%)';
          
          // Start point handle
          ctx.beginPath();
          ctx.arc(startX, startY, isSelected ? 6 : 4, 0, 2 * Math.PI);
          ctx.fill();
          
          // End point handle  
          ctx.beginPath();
          ctx.arc(endX, endY, isSelected ? 6 : 4, 0, 2 * Math.PI);
          ctx.fill();
          
          // Add white border to handles when selected for better visibility
          if (isSelected) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(startX, startY, 6, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(endX, endY, 6, 0, 2 * Math.PI);
            ctx.stroke();
          }
        } else {
          const x = shape.position.x * PIXELS_PER_METER * canvasScale;
          const y = shape.position.y * PIXELS_PER_METER * canvasScale;
        
          ctx.save();
          ctx.translate(x, y);
          if (shape.rotation) {
            ctx.rotate((shape.rotation * Math.PI) / 180);
          }

          if (shape.type === 'circle') {
            const radius = (shape.dimensions.radius || 0) * PIXELS_PER_METER * canvasScale;
            ctx.beginPath();
            ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          } else {
            const width = (shape.dimensions.width || 0) * PIXELS_PER_METER * canvasScale;
            const height = (shape.dimensions.length || 0) * PIXELS_PER_METER * canvasScale;
            ctx.fillRect(0, 0, width, height);
            ctx.strokeRect(0, 0, width, height);
          }

          ctx.restore();
        }
      }
    });
  };

  const getShapeAt = (x: number, y: number) => {
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      
      if (shape.type === 'line') {
        // Check if click is near the line
        const startX = shape.startPoint!.x * PIXELS_PER_METER * canvasScale;
        const startY = shape.startPoint!.y * PIXELS_PER_METER * canvasScale;
        const endX = shape.endPoint!.x * PIXELS_PER_METER * canvasScale;
        const endY = shape.endPoint!.y * PIXELS_PER_METER * canvasScale;
        
        // Distance from point to line
        const A = x - startX;
        const B = y - startY;
        const C = endX - startX;
        const D = endY - startY;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        const param = lenSq !== 0 ? dot / lenSq : -1;
        
        let xx, yy;
        if (param < 0) {
          xx = startX;
          yy = startY;
        } else if (param > 1) {
          xx = endX;
          yy = endY;
        } else {
          xx = startX + param * C;
          yy = startY + param * D;
        }
        
        const dx = x - xx;
        const dy = y - yy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= 10) return shape.id; // 10px tolerance for line selection
      } else {
        const shapeX = shape.position.x * PIXELS_PER_METER * canvasScale;
        const shapeY = shape.position.y * PIXELS_PER_METER * canvasScale;
        
        if (shape.type === 'circle') {
          const radius = (shape.dimensions.radius || 0) * PIXELS_PER_METER * canvasScale;
          const distance = Math.sqrt((x - shapeX - radius) ** 2 + (y - shapeY - radius) ** 2);
          if (distance <= radius) return shape.id;
        } else {
          const width = (shape.dimensions.width || 0) * PIXELS_PER_METER * canvasScale;
          const height = (shape.dimensions.length || 0) * PIXELS_PER_METER * canvasScale;
          if (x >= shapeX && x <= shapeX + width && y >= shapeY && y <= shapeY + height) {
            return shape.id;
          }
        }
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if we clicked on an existing shape
    let clickedShapeId: string | null = null;
    let clickedEndpoint: 'start' | 'end' | null = null;
    
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      let isInside = false;

      if (shape.type === 'line') {
        // Check if click is on line endpoints first (for easier manipulation)
        const x1 = shape.startPoint!.x * PIXELS_PER_METER * canvasScale;
        const y1 = shape.startPoint!.y * PIXELS_PER_METER * canvasScale;
        const x2 = shape.endPoint!.x * PIXELS_PER_METER * canvasScale;
        const y2 = shape.endPoint!.y * PIXELS_PER_METER * canvasScale;
        
        const startDistance = Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
        const endDistance = Math.sqrt((x - x2) ** 2 + (y - y2) ** 2);
        
        if (startDistance < 15) {
          isInside = true;
          clickedEndpoint = 'start';
        } else if (endDistance < 15) {
          isInside = true;
          clickedEndpoint = 'end';
        } else {
          // Check if click is near the line for whole line dragging
          const A = x - x1;
          const B = y - y1;
          const C = x2 - x1;
          const D = y2 - y1;
          
          const dot = A * C + B * D;
          const lenSq = C * C + D * D;
          let param = -1;
          
          if (lenSq !== 0) {
            param = dot / lenSq;
          }
          
          let xx, yy;
          
          if (param < 0) {
            xx = x1;
            yy = y1;
          } else if (param > 1) {
            xx = x2;
            yy = y2;
          } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
          }
          
          const dx = x - xx;
          const dy = y - yy;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          isInside = distance < 10; // 10 pixel tolerance
        }
      } else {
        const shapeX = shape.position.x * PIXELS_PER_METER * canvasScale;
        const shapeY = shape.position.y * PIXELS_PER_METER * canvasScale;
        
        if (shape.type === 'rectangle' || shape.type === 'square') {
          const width = (shape.dimensions.width || 0) * PIXELS_PER_METER * canvasScale;
          const height = (shape.dimensions.length || shape.dimensions.width || 0) * PIXELS_PER_METER * canvasScale;
          isInside = x >= shapeX && x <= shapeX + width && y >= shapeY && y <= shapeY + height;
        } else if (shape.type === 'circle') {
          const radius = (shape.dimensions.radius || 0) * PIXELS_PER_METER * canvasScale;
          const centerX = shapeX + radius;
          const centerY = shapeY + radius;
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          isInside = distance <= radius;
        }
      }

      if (isInside) {
        clickedShapeId = shape.id;
        break;
      }
    }

    if (clickedShapeId) {
      const shapeId = clickedShapeId;
      selectShape(shapeId);
      setIsDragging(true);
      setDragShape(shapeId);
      setIsDraggingEndpoint(clickedEndpoint);
      
      const shape = shapes.find(s => s.id === shapeId);
      if (shape) {
        if (shape.type === 'line') {
          if (clickedEndpoint === 'start') {
            setDragOffset({
              x: x - shape.startPoint!.x * PIXELS_PER_METER * canvasScale,
              y: y - shape.startPoint!.y * PIXELS_PER_METER * canvasScale,
            });
          } else if (clickedEndpoint === 'end') {
            setDragOffset({
              x: x - shape.endPoint!.x * PIXELS_PER_METER * canvasScale,
              y: y - shape.endPoint!.y * PIXELS_PER_METER * canvasScale,
            });
          } else {
            // Dragging whole line
            const midX = (shape.startPoint!.x + shape.endPoint!.x) / 2;
            const midY = (shape.startPoint!.y + shape.endPoint!.y) / 2;
            setDragOffset({
              x: x - midX * PIXELS_PER_METER * canvasScale,
              y: y - midY * PIXELS_PER_METER * canvasScale,
            });
          }
        } else {
          setDragOffset({
            x: x - shape.position.x * PIXELS_PER_METER * canvasScale,
            y: y - shape.position.y * PIXELS_PER_METER * canvasScale,
          });
        }
      }
    } else {
      selectShape(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragShape) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const shape = shapes.find(s => s.id === dragShape);
    if (!shape) return;
    
    if (shape.type === 'line') {
      if (isDraggingEndpoint === 'start') {
        // Move only the start point
        const newX = (x - dragOffset.x) / (PIXELS_PER_METER * canvasScale);
        const newY = (y - dragOffset.y) / (PIXELS_PER_METER * canvasScale);
        
        updateShape(dragShape, {
          startPoint: {
            x: Math.max(0, newX),
            y: Math.max(0, newY)
          }
        });
      } else if (isDraggingEndpoint === 'end') {
        // Move only the end point
        const newX = (x - dragOffset.x) / (PIXELS_PER_METER * canvasScale);
        const newY = (y - dragOffset.y) / (PIXELS_PER_METER * canvasScale);
        
        updateShape(dragShape, {
          endPoint: {
            x: Math.max(0, newX),
            y: Math.max(0, newY)
          }
        });
      } else {
        // Move the entire line
        const newMidX = (x - dragOffset.x) / (PIXELS_PER_METER * canvasScale);
        const newMidY = (y - dragOffset.y) / (PIXELS_PER_METER * canvasScale);
        
        const currentMidX = (shape.startPoint!.x + shape.endPoint!.x) / 2;
        const currentMidY = (shape.startPoint!.y + shape.endPoint!.y) / 2;
        
        const deltaX = newMidX - currentMidX;
        const deltaY = newMidY - currentMidY;
        
        updateShape(dragShape, {
          startPoint: {
            x: Math.max(0, shape.startPoint!.x + deltaX),
            y: Math.max(0, shape.startPoint!.y + deltaY)
          },
          endPoint: {
            x: Math.max(0, shape.endPoint!.x + deltaX),
            y: Math.max(0, shape.endPoint!.y + deltaY)
          }
        });
      }
    } else {
      const newX = (x - dragOffset.x) / (PIXELS_PER_METER * canvasScale);
      const newY = (y - dragOffset.y) / (PIXELS_PER_METER * canvasScale);
      
      updateShape(dragShape, {
        position: { x: Math.max(0, newX), y: Math.max(0, newY) }
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragShape(null);
    setIsDraggingEndpoint(null);
  };

  useEffect(() => {
    drawShapes();
  }, [shapes, selectedShapeId, canvasScale, canvasOffset]);

  const handleZoom = (direction: 'in' | 'out') => {
    const scaleBy = 1.1;
    const newScale = direction === 'in' 
      ? canvasScale * scaleBy 
      : canvasScale / scaleBy;
    setCanvasScale(newScale);
  };

  const handleResetView = () => {
    setCanvasScale(1);
    setCanvasOffset({ x: 0, y: 0 });
  };

  const selectedShape = shapes.find(s => s.id === selectedShapeId);

  return (
    <Card className="h-full bg-canvas-bg shadow-panel relative overflow-hidden">
      {/* Canvas Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => handleZoom('in')}>
          <ZoomIn size={16} />
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleZoom('out')}>
          <ZoomOut size={16} />
        </Button>
        <Button variant="outline" size="sm" onClick={handleResetView}>
          <RotateCcw size={16} />
        </Button>
      </div>

      {/* Shape Info Panel */}
      {selectedShape && (
        <div className="absolute top-4 left-4 z-10 bg-card p-3 rounded-lg shadow-tool border">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <div className="font-medium text-foreground">
                {selectedShape.type.charAt(0).toUpperCase() + selectedShape.type.slice(1)}
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedShape.type === 'circle' 
                  ? `Radius: ${selectedShape.dimensions.radius?.toFixed(1)}m`
                  : selectedShape.type === 'line'
                    ? `Length: ${selectedShape.dimensions.lineLength?.toFixed(1)}m`
                    : `${selectedShape.dimensions.width?.toFixed(1)}m × ${selectedShape.dimensions.length?.toFixed(1)}m`
                }
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteShape(selectedShape.id)}
            >
              <X size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Scale Indicator */}
      <div className="absolute bottom-4 left-4 z-10 bg-card p-2 rounded border">
        <div className="text-xs text-muted-foreground">
          Scale: {(canvasScale * 100).toFixed(0)}%
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={1200}
        height={800}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </Card>
  );
};