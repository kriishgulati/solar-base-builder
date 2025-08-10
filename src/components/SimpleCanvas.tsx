import { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useShapeStore } from '@/stores/shapeStore';
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';

const PIXELS_PER_METER = 50; // 1 meter = 50 pixels for display

export const SimpleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragShape, setDragShape] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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
        const startY = (shape.position.y + (shape.dimensions.height || shape.dimensions.radius || 0) / 2) * PIXELS_PER_METER * canvasScale;
        const endX = (connectedShape.position.x + (connectedShape.dimensions.width || connectedShape.dimensions.radius || 0) / 2) * PIXELS_PER_METER * canvasScale;
        const endY = (connectedShape.position.y + (connectedShape.dimensions.height || connectedShape.dimensions.radius || 0) / 2) * PIXELS_PER_METER * canvasScale;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    });

    // Draw shapes
    shapes.forEach(shape => {
      const x = shape.position.x * PIXELS_PER_METER * canvasScale;
      const y = shape.position.y * PIXELS_PER_METER * canvasScale;
      
      const isSelected = selectedShapeId === shape.id;
      const isMerged = shape.merged;
      
      ctx.fillStyle = isMerged 
        ? 'hsl(142 76% 55% / 0.8)' 
        : isSelected 
          ? 'hsl(35 91% 55%)' 
          : 'hsl(35 91% 55% / 0.8)';
      
      ctx.strokeStyle = isMerged 
        ? 'hsl(142 76% 55%)' 
        : isSelected 
          ? 'hsl(213 100% 60%)' 
          : 'hsl(35 91% 55%)';
      
      ctx.lineWidth = isSelected ? 3 : 2;

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
        const height = (shape.dimensions.height || 0) * PIXELS_PER_METER * canvasScale;
        ctx.fillRect(0, 0, width, height);
        ctx.strokeRect(0, 0, width, height);
      }

      ctx.restore();
    });
  };

  const getShapeAt = (x: number, y: number) => {
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      const shapeX = shape.position.x * PIXELS_PER_METER * canvasScale;
      const shapeY = shape.position.y * PIXELS_PER_METER * canvasScale;
      
      if (shape.type === 'circle') {
        const radius = (shape.dimensions.radius || 0) * PIXELS_PER_METER * canvasScale;
        const distance = Math.sqrt((x - shapeX - radius) ** 2 + (y - shapeY - radius) ** 2);
        if (distance <= radius) return shape.id;
      } else {
        const width = (shape.dimensions.width || 0) * PIXELS_PER_METER * canvasScale;
        const height = (shape.dimensions.height || 0) * PIXELS_PER_METER * canvasScale;
        if (x >= shapeX && x <= shapeX + width && y >= shapeY && y <= shapeY + height) {
          return shape.id;
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
    
    const shapeId = getShapeAt(x, y);
    
    if (shapeId) {
      if (shapeMergeEnabled && selectedShapeId && selectedShapeId !== shapeId) {
        const { mergeShapes } = useShapeStore.getState();
        mergeShapes([selectedShapeId, shapeId]);
        selectShape(null);
      } else {
        selectShape(shapeId);
        setIsDragging(true);
        setDragShape(shapeId);
        
        const shape = shapes.find(s => s.id === shapeId);
        if (shape) {
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
    
    const newX = (x - dragOffset.x) / (PIXELS_PER_METER * canvasScale);
    const newY = (y - dragOffset.y) / (PIXELS_PER_METER * canvasScale);
    
    updateShape(dragShape, {
      position: { x: Math.max(0, newX), y: Math.max(0, newY) }
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragShape(null);
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
                  : `${selectedShape.dimensions.width?.toFixed(1)}m × ${selectedShape.dimensions.height?.toFixed(1)}m`
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
        width={800}
        height={600}
        className="cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </Card>
  );
};