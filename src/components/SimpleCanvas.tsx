import { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useShapeStore } from '@/stores/shapeStore';
import type { Shape } from '@/stores/shapeStore';
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';
import { TopViewCanvas } from '@/components/TopViewCanvas';
import { ObstacleToolbar } from '@/components/ObstacleToolbar';

const PIXELS_PER_METER = 50; // 1 meter = 50 pixels for display

export const SimpleCanvas = ({ setShowObstacleMode }: { setShowObstacleMode: (v: boolean) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragShape, setDragShape] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<{start: {x: number, y: number}, end: {x: number, y: number}} | null>(null);
  const [groupDragOffset, setGroupDragOffset] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [guidelines, setGuidelines] = useState<{ x1: number; y1: number; x2: number; y2: number; label: string }[]>([]);

//hello test
//bye test
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

    // Draw grid centered on canvas center
    ctx.strokeStyle = 'hsl(var(--border))';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.2;
    const gridSize = PIXELS_PER_METER * canvasScale;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    // vertical lines to the right
    for (let x = centerX; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    // vertical lines to the left
    for (let x = centerX - gridSize; x >= 0; x -= gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    // horizontal lines below
    for (let y = centerY; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    // horizontal lines above
    for (let y = centerY - gridSize; y >= 0; y -= gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Draw connection lines (center-to-center)
    shapes.forEach(shape => {
      shape.connectedTo.forEach(connectedId => {
        const connectedShape = shapes.find(s => s.id === connectedId);
        if (!connectedShape) return;

        ctx.strokeStyle = 'hsl(142 76% 55%)';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);

        const startX = centerX + (shape.position.x) * PIXELS_PER_METER * canvasScale;
        const startY = centerY + (shape.position.y) * PIXELS_PER_METER * canvasScale;
        const endX = centerX + (connectedShape.position.x) * PIXELS_PER_METER * canvasScale;
        const endY = centerY + (connectedShape.position.y) * PIXELS_PER_METER * canvasScale;

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

      // Set fill and stroke styles
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

      // Get shape dimensions
      const length = (shape.dimensions.length || 0) * PIXELS_PER_METER * canvasScale;
      const width = (shape.dimensions.width || shape.dimensions.length || 0) * PIXELS_PER_METER * canvasScale;
      const radius = (shape.dimensions.radius || 0) * PIXELS_PER_METER * canvasScale;
      const rotation = (shape.rotation || 0) * Math.PI / 180;

      // Use center position directly
      let centerX, centerY;
      centerX = (canvas.width / 2) + (shape.position.x) * PIXELS_PER_METER * canvasScale;
      centerY = (canvas.height / 2) + (shape.position.y) * PIXELS_PER_METER * canvasScale;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);

      if (shape.type === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else if (shape.type === 'triangle') {
        // Equilateral triangle centered at (0,0)
        const triLength = length;
        const triHeight = (triLength * Math.sqrt(3)) / 2;
        ctx.beginPath();
        ctx.moveTo(0, -triHeight / 2); // Top
        ctx.lineTo(-triLength / 2, triHeight / 2); // Bottom left
        ctx.lineTo(triLength / 2, triHeight / 2); // Bottom right
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Rectangle centered at (0,0)
        ctx.beginPath();
        ctx.rect(-length / 2, -width / 2, length, width);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    });

    // Draw dynamic ruler guidelines while dragging
    if (isDragging && guidelines.length > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(120, 120, 120, 0.9)';
      ctx.fillStyle = 'rgba(40, 40, 40, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      guidelines.forEach(g => {
        ctx.beginPath();
        ctx.moveTo(g.x1, g.y1);
        ctx.lineTo(g.x2, g.y2);
        ctx.stroke();

        const midX = (g.x1 + g.x2) / 2;
        const midY = (g.y1 + g.y2) / 2;
        const padding = 4;
        const textWidth = ctx.measureText(g.label).width;
        const boxW = textWidth + padding * 2;
        const boxH = 16;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);
        ctx.strokeStyle = 'rgba(120,120,120,0.9)';
        ctx.strokeRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);
        ctx.fillStyle = 'rgba(40,40,40,0.95)';
        ctx.fillText(g.label, midX, midY);
      });

      ctx.restore();
    }
  };

  const getShapeBBoxMeters = (s: Shape) => {
    if (s.type === 'circle') {
      const d = (s.dimensions.radius || 0) * 2;
      return { length: d, width: d };
    }
    if (s.type === 'triangle') {
      const l = s.dimensions.length || 0;
      const h = (l * Math.sqrt(3)) / 2;
      return { length: l, width: h };
    }
    if (s.type === 'square') {
      const l = s.dimensions.length || 0;
      return { length: l, width: l };
    }
    return { length: s.dimensions.length || 0, width: s.dimensions.width || 0 };
  };

  const computeGuidelinesForShape = (moving: Shape) => {
    const canvas = canvasRef.current;
    if (!canvas) return [] as { x1: number; y1: number; x2: number; y2: number; label: string }[];

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const toPixels = (m: number) => m * PIXELS_PER_METER * canvasScale;

    const movingBBox = getShapeBBoxMeters(moving);
    const movingCenterPx = {
      x: centerX + moving.position.x * PIXELS_PER_METER * canvasScale,
      y: centerY + moving.position.y * PIXELS_PER_METER * canvasScale,
    };

    const lines: { x1: number; y1: number; x2: number; y2: number; label: string }[] = [];

    // Nearest neighbor guideline (single)
    const others = shapes.filter(s => s.id !== moving.id);
    if (others.length > 0) {
      type Neighbor = { target: typeof shapes[number]; dxEdgeM: number; dyEdgeM: number };
      const neighbors: Neighbor[] = others.map(target => {
        const targetBBox = getShapeBBoxMeters(target);
        const dxCenterM = Math.abs(moving.position.x - target.position.x);
        const dyCenterM = Math.abs(moving.position.y - target.position.y);
        const dxEdgeM = Math.max(0, dxCenterM - (movingBBox.length / 2 + targetBBox.length / 2));
        const dyEdgeM = Math.max(0, dyCenterM - (movingBBox.width / 2 + targetBBox.width / 2));
        return { target, dxEdgeM, dyEdgeM };
      });

      const closest = neighbors.reduce((best, curr) => {
        const currMin = Math.min(curr.dxEdgeM, curr.dyEdgeM);
        const bestMin = Math.min(best.dxEdgeM, best.dyEdgeM);
        return currMin < bestMin ? curr : best;
      });

      const t = closest.target;
      const tBBox = getShapeBBoxMeters(t);
      const tCenterPx = {
        x: centerX + t.position.x * PIXELS_PER_METER * canvasScale,
        y: centerY + t.position.y * PIXELS_PER_METER * canvasScale,
      };

      if (closest.dxEdgeM <= closest.dyEdgeM) {
        const horizDir = Math.sign(tCenterPx.x - movingCenterPx.x) || 1;
        const movingEdgePx = movingCenterPx.x + toPixels(movingBBox.length / 2) * (horizDir > 0 ? 1 : -1);
        const targetEdgePx = tCenterPx.x - toPixels(tBBox.length / 2) * (horizDir > 0 ? 1 : -1);
        const yH = movingCenterPx.y;
        if (targetEdgePx !== movingEdgePx) {
          lines.push({ x1: movingEdgePx, y1: yH, x2: targetEdgePx, y2: yH, label: `${closest.dxEdgeM.toFixed(2)} m` });
        }
      } else {
        const vertDir = Math.sign(tCenterPx.y - movingCenterPx.y) || 1;
        const movingEdgePx = movingCenterPx.y + toPixels(movingBBox.width / 2) * (vertDir > 0 ? 1 : -1);
        const targetEdgePx = tCenterPx.y - toPixels(tBBox.width / 2) * (vertDir > 0 ? 1 : -1);
        const xV = movingCenterPx.x;
        if (targetEdgePx !== movingEdgePx) {
          lines.push({ x1: xV, y1: movingEdgePx, x2: xV, y2: targetEdgePx, label: `${closest.dyEdgeM.toFixed(2)} m` });
        }
      }
    }

    // Add two closest walls (one per axis) from base AABB of shapes
    const shapesForWalls = shapes.filter(s => s.id !== moving.id);
    if (shapesForWalls.length > 0) {
      const getShapeBBox = getShapeBBoxMeters;

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      shapesForWalls.forEach(s => {
        const b = getShapeBBox(s);
        minX = Math.min(minX, s.position.x - b.length / 2);
        maxX = Math.max(maxX, s.position.x + b.length / 2);
        minY = Math.min(minY, s.position.y - b.width / 2);
        maxY = Math.max(maxY, s.position.y + b.width / 2);
      });

      const mLeft = moving.position.x - movingBBox.length / 2;
      const mRight = moving.position.x + movingBBox.length / 2;
      const mTop = moving.position.y - movingBBox.width / 2;
      const mBottom = moving.position.y + movingBBox.width / 2;

      const distLeft = mLeft - minX;
      const distRight = maxX - mRight;
      const distTop = mTop - minY;
      const distBottom = maxY - mBottom;

      // Closest X wall
      if (isFinite(minX) && isFinite(maxX)) {
        if (Math.abs(distLeft) <= Math.abs(distRight)) {
          const xWallPx = centerX + toPixels(minX);
          const xEdgePx = centerX + toPixels(mLeft);
          const yLine = movingCenterPx.y;
          if (xWallPx !== xEdgePx) {
            lines.push({ x1: xEdgePx, y1: yLine, x2: xWallPx, y2: yLine, label: `${Math.abs(distLeft).toFixed(2)} m` });
          }
        } else {
          const xWallPx = centerX + toPixels(maxX);
          const xEdgePx = centerX + toPixels(mRight);
          const yLine = movingCenterPx.y;
          if (xWallPx !== xEdgePx) {
            lines.push({ x1: xEdgePx, y1: yLine, x2: xWallPx, y2: yLine, label: `${Math.abs(distRight).toFixed(2)} m` });
          }
        }
      }

      // Closest Y wall
      if (isFinite(minY) && isFinite(maxY)) {
        if (Math.abs(distTop) <= Math.abs(distBottom)) {
          const yWallPx = centerY + toPixels(minY);
          const yEdgePx = centerY + toPixels(mTop);
          const xLine = movingCenterPx.x;
          if (yWallPx !== yEdgePx) {
            lines.push({ x1: xLine, y1: yEdgePx, x2: xLine, y2: yWallPx, label: `${Math.abs(distTop).toFixed(2)} m` });
          }
        } else {
          const yWallPx = centerY + toPixels(maxY);
          const yEdgePx = centerY + toPixels(mBottom);
          const xLine = movingCenterPx.x;
          if (yWallPx !== yEdgePx) {
            lines.push({ x1: xLine, y1: yEdgePx, x2: xLine, y2: yWallPx, label: `${Math.abs(distBottom).toFixed(2)} m` });
          }
        }
      }
    }

    return lines;
  };

  const getShapeAt = (x: number, y: number) => {
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      const length = (shape.dimensions.length || 0) * PIXELS_PER_METER * canvasScale;
      const width = (shape.dimensions.width || shape.dimensions.length || 0) * PIXELS_PER_METER * canvasScale;
      const radius = (shape.dimensions.radius || 0) * PIXELS_PER_METER * canvasScale;
      const rotation = (shape.rotation || 0) * Math.PI / 180;

      let centerX, centerY;
      if (shape.type === 'circle') {
        centerX = (canvasRef.current!.width / 2) + (shape.position.x) * PIXELS_PER_METER * canvasScale;
        centerY = (canvasRef.current!.height / 2) + (shape.position.y) * PIXELS_PER_METER * canvasScale;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance <= radius) return shape.id;
      } else {
        centerX = (canvasRef.current!.width / 2) + (shape.position.x) * PIXELS_PER_METER * canvasScale;
        centerY = (canvasRef.current!.height / 2) + (shape.position.y) * PIXELS_PER_METER * canvasScale;

        // Transform click point into shape's local coordinates
        const dx = x - centerX;
        const dy = y - centerY;
        const localX =  dx * Math.cos(-rotation) - dy * Math.sin(-rotation);
        const localY =  dx * Math.sin(-rotation) + dy * Math.cos(-rotation);

        if (shape.type === 'triangle') {
          // Simple bounding box for triangle (not perfect, but better)
          const triLength = length;
          const triHeight = (triLength * Math.sqrt(3)) / 2;
          if (
            localX >= -triLength / 2 && localX <= triLength / 2 &&
            localY >= -triHeight / 2 && localY <= triHeight / 2
          ) {
            return shape.id;
          }
        } else {
          // Rectangle
          if (
            localX >= -length / 2 && localX <= length / 2 &&
            localY >= -width / 2 && localY <= width / 2
          ) {
            return shape.id;
          }
        }
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
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
            x: x - ((canvas.width / 2) + shape.position.x * PIXELS_PER_METER * canvasScale),
            y: y - ((canvas.height / 2) + shape.position.y * PIXELS_PER_METER * canvasScale),
          });
        }
      }
    } else {
      selectShape(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragShape) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const newX = (x - dragOffset.x - (canvas.width / 2)) / (PIXELS_PER_METER * canvasScale);
    const newY = (y - dragOffset.y - (canvas.height / 2)) / (PIXELS_PER_METER * canvasScale);
    
    updateShape(dragShape, {
      position: { x: newX, y: newY }
    });

    const moving = shapes.find(s => s.id === dragShape);
    if (moving) {
      setGuidelines(computeGuidelinesForShape({ ...moving, position: { x: newX, y: newY } } as typeof moving));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragShape(null);
    setGuidelines([]);
  };

  useEffect(() => {
    drawShapes();
  }, [shapes, selectedShapeId, canvasScale, canvasOffset, isDragging, guidelines]);

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
                  : selectedShape.type === 'triangle' || selectedShape.type === 'square'
                    ? `Length: ${selectedShape.dimensions.length?.toFixed(1)}m`
                    : `${selectedShape.dimensions.length?.toFixed(1)}m × ${selectedShape.dimensions.width?.toFixed(1)}m`
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
        className="cursor-crosshair w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Add Obstacles Button */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowObstacleMode(true)}
            className="bg-primary hover:bg-primary/90"
            disabled={shapes.length === 0}
          >
            Add Obstacles
          </Button>
        </div>
      </div>
    </Card>
  );
};

export const SiteBaseDefinition = () => {
  const [showObstacleMode, setShowObstacleMode] = useState(false);
  const { baseHeight, shapes } = useShapeStore(); // Add shapes to destructuring

  return (
    <div className="h-screen bg-gradient-subtle">
      {showObstacleMode ? (
        <div className="h-full flex">
          {/* Left Panel - Obstacle Tools */}
          <div className="w-1/5 p-4 border-r bg-background">
            <ObstacleToolbar 
              onClose={() => setShowObstacleMode(false)}
              baseHeight={baseHeight}
            />
          </div>
          {/* Right Panel - Canvas */}
          <div className="w-4/5 p-4">
            <TopViewCanvas shapes={shapes} />
          </div>
        </div>
      ) : (
        <SimpleCanvas setShowObstacleMode={setShowObstacleMode} />
      )}
    </div>
  );
};