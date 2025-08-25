const PIXELS_PER_METER = 50;

import { useRef, useEffect, useState } from 'react';
import { useShapeStore, Shape, Obstacle } from '@/stores/shapeStore';

interface TopViewCanvasProps {
  shapes: Shape[];
}

export const TopViewCanvas = ({ shapes }: TopViewCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [centerCoords, setCenterCoords] = useState({ x: 0, y: 0 });
  
  const [isDragging, setIsDragging] = useState(false);
  const [draggedObstacle, setDraggedObstacle] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [guidelines, setGuidelines] = useState<
    { x1: number; y1: number; x2: number; y2: number; label: string }[]
  >([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setCenterCoords({
      x: canvas.width / 2,
      y: canvas.height / 2
    });
  }, []);

  const {
    obstacles,
    selectedObstacleId,
    selectObstacle,
    updateObstacle,
    deleteObstacle,
    canvasScale,
    canvasOffset,
    setCanvasScale,
    setCanvasOffset,
    obstacleMode
  } = useShapeStore();

  const drawShapes = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid(ctx, canvas.width, canvas.height);

    shapes.forEach((shape) => {
      drawShape(ctx, shape, false, false, 'base');
    });

    obstacles.forEach((obstacle) => {
      const isSelected = selectedObstacleId === obstacle.id;
      drawObstacle(ctx, obstacle, isSelected);
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
        // Label background
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

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = PIXELS_PER_METER * canvasScale;
    ctx.strokeStyle = 'hsl(213, 30%, 90%)';
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape, isSelected: boolean, isHovered: boolean, type: 'base' | 'obstacle' = 'base') => {
    ctx.save();
    
    const canvas = canvasRef.current;
    const x = (canvas ? canvas.width / 2 : 0) + shape.position.x * PIXELS_PER_METER * canvasScale;
    const y = (canvas ? canvas.height / 2 : 0) + shape.position.y * PIXELS_PER_METER * canvasScale;
    
    ctx.translate(x, y);
    ctx.rotate((shape.rotation * Math.PI) / 180);

    if (type === 'base') {
      ctx.fillStyle = isSelected ? 'hsl(142, 71%, 80%)' : 'hsl(142, 71%, 85%)';
      ctx.strokeStyle = 'hsl(142, 71%, 60%)';
    } else {
      ctx.fillStyle = isSelected ? 'hsl(0, 84%, 70%)' : 'hsl(0, 84%, 75%)';
      ctx.strokeStyle = 'hsl(0, 84%, 50%)';
    }
    
    ctx.lineWidth = isSelected ? 3 : 2;

    if (shape.type === 'circle') {
      const radius = (shape.dimensions.radius || 1) * PIXELS_PER_METER * canvasScale;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (shape.type === 'triangle') {
      const length = (shape.dimensions.length || 1) * PIXELS_PER_METER * canvasScale;
      const height = (length * Math.sqrt(3)) / 2;
      
      ctx.beginPath();
      ctx.moveTo(0, -height / 2);
      ctx.lineTo(-length / 2, height / 2);
      ctx.lineTo(length / 2, height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      const length = (shape.dimensions.length || 1) * PIXELS_PER_METER * canvasScale;
      const width = shape.type === 'square' ? length : (shape.dimensions.width || 1) * PIXELS_PER_METER * canvasScale;
      
      ctx.beginPath();
      ctx.rect(-length / 2, -width / 2, length, width);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawObstacle = (ctx: CanvasRenderingContext2D, obstacle: Obstacle, isSelected: boolean) => {
    ctx.save();
    
    const canvas = canvasRef.current;
    const x = (canvas ? canvas.width / 2 : 0) + obstacle.position.x * PIXELS_PER_METER * canvasScale;
    const y = (canvas ? canvas.height / 2 : 0) + obstacle.position.y * PIXELS_PER_METER * canvasScale;
    
    ctx.translate(x, y);
    ctx.rotate((obstacle.rotation * Math.PI) / 180);

    if (obstacle.type === 'solarPanel') {
      ctx.fillStyle = isSelected ? '#244a86' : '#2c5596';
      ctx.strokeStyle = '#1d3a6b';
    } else {
      ctx.fillStyle = isSelected ? 'hsl(0, 84%, 70%)' : 'hsl(0, 84%, 75%)';
      ctx.strokeStyle = 'hsl(0, 84%, 50%)';
    }
    ctx.lineWidth = isSelected ? 3 : 2;

    if (obstacle.type === 'circle') {
      const radius = (obstacle.dimensions.radius || 1) * PIXELS_PER_METER * canvasScale;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (obstacle.type === 'triangle') {
      const length = (obstacle.dimensions.length || 1) * PIXELS_PER_METER * canvasScale;
      const height = (length * Math.sqrt(3)) / 2;
      
      ctx.beginPath();
      ctx.moveTo(0, -height / 2);
      ctx.lineTo(-length / 2, height / 2);
      ctx.lineTo(length / 2, height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      const baseLengthMeters = obstacle.type === 'solarPanel' ? 2 : (obstacle.dimensions.length || 1);
      const baseWidthMeters = obstacle.type === 'solarPanel' ? 1 : (obstacle.type === 'square' ? (obstacle.dimensions.length || 1) : (obstacle.dimensions.width || 1));
      const length = baseLengthMeters * PIXELS_PER_METER * canvasScale;
      const width = baseWidthMeters * PIXELS_PER_METER * canvasScale;
      
      ctx.beginPath();
      ctx.rect(-length / 2, -width / 2, length, width);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  };

  const getObstacleAt = (x: number, y: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const transformedX = (x - (canvas.width / 2)) / canvasScale;
    const transformedY = (y - (canvas.height / 2)) / canvasScale;

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];
      const obstacleX = obstacle.position.x * PIXELS_PER_METER;
      const obstacleY = obstacle.position.y * PIXELS_PER_METER;

      let isInside = false;

      if (obstacle.type === 'circle') {
        const radius = (obstacle.dimensions.radius || 1) * PIXELS_PER_METER;
        const distance = Math.sqrt(
          Math.pow(transformedX - obstacleX, 2) + Math.pow(transformedY - obstacleY, 2)
        );
        isInside = distance <= radius;
      } else if (obstacle.type === 'triangle') {
        const length = (obstacle.dimensions.length || 1) * PIXELS_PER_METER;
        const height = (length * Math.sqrt(3)) / 2;
        
        const dx = transformedX - obstacleX;
        const dy = transformedY - obstacleY;
        
        isInside = Math.abs(dx) <= length / 2 && Math.abs(dy) <= height / 2;
      } else {
        const baseLengthMeters = obstacle.type === 'solarPanel' ? 2 : (obstacle.dimensions.length || 1);
        const baseWidthMeters = obstacle.type === 'solarPanel' ? 1 : (obstacle.type === 'square' ? (obstacle.dimensions.length || 1) : (obstacle.dimensions.width || 1));
        const length = baseLengthMeters * PIXELS_PER_METER;
        const width = baseWidthMeters * PIXELS_PER_METER;

        // Approximate hit test ignoring rotation (existing behavior)
        const dx = transformedX - obstacleX;
        const dy = transformedY - obstacleY;
        isInside = Math.abs(dx) <= length / 2 && Math.abs(dy) <= width / 2;
      }

      if (isInside) return obstacle.id;
    }

    return null;
  };

  const getObstacleBBoxMeters = (o: Obstacle) => {
    if (o.type === 'circle') {
      const d = (o.dimensions.radius || 1) * 2;
      return { length: d, width: d };
    }
    if (o.type === 'triangle') {
      const length = (o.dimensions.length || 1);
      const triHeight = (length * Math.sqrt(3)) / 2;
      return { length, width: triHeight };
    }
    if (o.type === 'square') {
      const l = (o.dimensions.length || 1);
      return { length: l, width: l };
    }
    if (o.type === 'solarPanel') {
      return { length: 2, width: 1 };
    }
    return { length: (o.dimensions.length || 1), width: (o.dimensions.width || 1) };
  };

  const computeGuidelines = (moving: Obstacle) => {
    const canvas = canvasRef.current;
    if (!canvas) return [] as { x1: number; y1: number; x2: number; y2: number; label: string }[];

    const others = obstacles.filter(o => o.id !== moving.id);
    const centerX = (canvas.width / 2);
    const centerY = (canvas.height / 2);
    const toPixels = (m: number) => m * PIXELS_PER_METER * canvasScale;

    const movingBBox = getObstacleBBoxMeters(moving);
    const movingCenterPx = {
      x: centerX + moving.position.x * PIXELS_PER_METER * canvasScale,
      y: centerY + moving.position.y * PIXELS_PER_METER * canvasScale,
    };

    const lines: { x1: number; y1: number; x2: number; y2: number; label: string }[] = [];

    // 1) Closest neighbor object (single)
    if (others.length > 0) {
      type Neighbor = { target: Obstacle; dxEdgeM: number; dyEdgeM: number };
      const neighbors: Neighbor[] = others.map(target => {
        const targetBBox = getObstacleBBoxMeters(target);
        const dxCenterM = Math.abs(moving.position.x - target.position.x);
        const dyCenterM = Math.abs(moving.position.y - target.position.y);
        const dxEdgeM = Math.max(0, dxCenterM - (movingBBox.length / 2 + targetBBox.length / 2));
        const dyEdgeM = Math.max(0, dyCenterM - (movingBBox.width / 2 + targetBBox.width / 2));
        return { target, dxEdgeM, dyEdgeM };
      });

      // Minimum edge distance in either axis
      const closest = neighbors.reduce((best, curr) => {
        const currMin = Math.min(curr.dxEdgeM, curr.dyEdgeM);
        const bestMin = Math.min(best.dxEdgeM, best.dyEdgeM);
        return currMin < bestMin ? curr : best;
      }, neighbors[0]);

      const t = closest.target;
      const tBBox = getObstacleBBoxMeters(t);
      const tCenterPx = {
        x: centerX + t.position.x * PIXELS_PER_METER * canvasScale,
        y: centerY + t.position.y * PIXELS_PER_METER * canvasScale,
      };

      if (closest.dxEdgeM <= closest.dyEdgeM) {
        // Horizontal guideline between facing edges
        const horizDir = Math.sign(tCenterPx.x - movingCenterPx.x) || 1;
        const movingEdgePx = movingCenterPx.x + toPixels(movingBBox.length / 2) * (horizDir > 0 ? 1 : -1);
        const targetEdgePx = tCenterPx.x - toPixels(tBBox.length / 2) * (horizDir > 0 ? 1 : -1);
        const yH = movingCenterPx.y;
        if (targetEdgePx !== movingEdgePx) {
          lines.push({ x1: movingEdgePx, y1: yH, x2: targetEdgePx, y2: yH, label: `${closest.dxEdgeM.toFixed(2)} m` });
        }
      } else {
        // Vertical guideline between facing edges
        const vertDir = Math.sign(tCenterPx.y - movingCenterPx.y) || 1;
        const movingEdgePx = movingCenterPx.y + toPixels(movingBBox.width / 2) * (vertDir > 0 ? 1 : -1);
        const targetEdgePx = tCenterPx.y - toPixels(tBBox.width / 2) * (vertDir > 0 ? 1 : -1);
        const xV = movingCenterPx.x;
        if (targetEdgePx !== movingEdgePx) {
          lines.push({ x1: xV, y1: movingEdgePx, x2: xV, y2: targetEdgePx, label: `${closest.dyEdgeM.toFixed(2)} m` });
        }
      }
    }

    // 2) Two closest base walls (one per axis) from base AABB of shapes
    if (shapes.length > 0) {
      // Compute base AABB in meters using shape footprints
      const getShapeBBox = (s: Shape) => {
        if (s.type === 'circle') {
          const d = (s.dimensions.radius || 1) * 2;
          return { length: d, width: d };
        }
        if (s.type === 'triangle') {
          const l = s.dimensions.length || 1;
          const h = (l * Math.sqrt(3)) / 2;
          return { length: l, width: h };
        }
        if (s.type === 'square') {
          const l = s.dimensions.length || 1;
          return { length: l, width: l };
        }
        return { length: s.dimensions.length || 1, width: s.dimensions.width || 1 };
      };

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      shapes.forEach(s => {
        const b = getShapeBBox(s);
        minX = Math.min(minX, s.position.x - b.length / 2);
        maxX = Math.max(maxX, s.position.x + b.length / 2);
        minY = Math.min(minY, s.position.y - b.width / 2);
        maxY = Math.max(maxY, s.position.y + b.width / 2);
      });

      // Distances in meters from moving bbox to walls
      const mLeft = moving.position.x - movingBBox.length / 2;
      const mRight = moving.position.x + movingBBox.length / 2;
      const mTop = moving.position.y - movingBBox.width / 2; // smaller y
      const mBottom = moving.position.y + movingBBox.width / 2; // larger y

      const distLeft = mLeft - minX;  // Remove Math.max(0, ...)
      const distRight = maxX - mRight;  // Remove Math.max(0, ...)
      const distTop = mTop - minY;  // Remove Math.max(0, ...)
      const distBottom = maxY - mBottom;  // Remove Math.max(0, ...)

      // Closest X wall
      if (isFinite(minX) && isFinite(maxX)) {
        if (Math.abs(distLeft) <= Math.abs(distRight)) {
          const xWallPx = centerX + toPixels(minX);
          const xEdgePx = centerX + toPixels(mLeft);
          const yLine = movingCenterPx.y;
          if (xWallPx !== xEdgePx) {
            lines.push({ 
              x1: xEdgePx, 
              y1: yLine, 
              x2: xWallPx, 
              y2: yLine, 
              label: `${Math.abs(distLeft).toFixed(2)} m` 
            });
          }
        } else {
          const xWallPx = centerX + toPixels(maxX);
          const xEdgePx = centerX + toPixels(mRight);
          const yLine = movingCenterPx.y;
          if (xWallPx !== xEdgePx) {
            lines.push({ 
              x1: xEdgePx, 
              y1: yLine, 
              x2: xWallPx, 
              y2: yLine, 
              label: `${Math.abs(distRight).toFixed(2)} m` 
            });
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
            lines.push({ 
              x1: xLine, 
              y1: yEdgePx, 
              x2: xLine, 
              y2: yWallPx, 
              label: `${Math.abs(distTop).toFixed(2)} m` 
            });
          }
        } else {
          const yWallPx = centerY + toPixels(maxY);
          const yEdgePx = centerY + toPixels(mBottom);
          const xLine = movingCenterPx.x;
          if (yWallPx !== yEdgePx) {
            lines.push({ 
              x1: xLine, 
              y1: yEdgePx, 
              x2: xLine, 
              y2: yWallPx, 
              label: `${Math.abs(distBottom).toFixed(2)} m` 
            });
          }
        }
      }
    }

    return lines;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const obstacleId = getObstacleAt(x, y);
    
    if (obstacleId) {
      const obstacle = obstacles.find(o => o.id === obstacleId);
      if (obstacle) {
        selectObstacle(obstacleId);
        setIsDragging(true);
        setDraggedObstacle(obstacleId);
        
        const transformedX = (x - (canvas.width / 2)) / canvasScale;
        const transformedY = (y - (canvas.height / 2)) / canvasScale;
        
        setDragOffset({
          x: transformedX - obstacle.position.x * PIXELS_PER_METER,
          y: transformedY - obstacle.position.y * PIXELS_PER_METER,
        });
      }
    } else {
      selectObstacle(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedObstacle) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const transformedX = (x - (canvas.width / 2)) / canvasScale;
    const transformedY = (y - (canvas.height / 2)) / canvasScale;

    let newX = (transformedX - dragOffset.x) / PIXELS_PER_METER;
    let newY = (transformedY - dragOffset.y) / PIXELS_PER_METER;

    // Snap-to-grid unless Ctrl is held
    if (!e.ctrlKey) {
      newX = Math.round(newX);
      newY = Math.round(newY);
    }

    updateObstacle(draggedObstacle, {
      position: { x: newX, y: newY },
    });

    const moving = obstacles.find(o => o.id === draggedObstacle);
    if (moving) {
      setGuidelines(computeGuidelines({ ...moving, position: { x: newX, y: newY } } as Obstacle));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedObstacle(null);
    setDragOffset({ x: 0, y: 0 });
    setGuidelines([]);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Delete' && selectedObstacleId) {
      deleteObstacle(selectedObstacleId);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setCanvasScale(canvasScale * scaleFactor);
  };

  useEffect(() => {
    drawShapes();
  }, [shapes, obstacles, selectedObstacleId, canvasScale, canvasOffset, scale, centerCoords, isDragging, guidelines]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObstacleId]);

  return (
    <div className="relative w-full h-full bg-background border rounded-lg overflow-hidden">
      <div className="absolute top-4 left-4 bg-card/90 backdrop-blur px-3 py-2 rounded-lg border text-sm text-muted-foreground">
        <div className="font-medium mb-1">Top View - Obstacle Placement</div>
        <div className="text-xs space-y-1">
          <div>Base shapes: <span className="text-green-600">Green</span></div>
          <div>Obstacles: <span className="text-red-600">Red</span></div>
          <div>Click and drag to move obstacles</div>
          <div>Hold Ctrl to disable snapping</div>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />
      
      {selectedObstacleId && (
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur px-3 py-2 rounded-lg border text-sm">
          <div className="font-medium text-foreground">Selected Obstacle</div>
          <div className="text-xs text-muted-foreground">Press Delete to remove</div>
        </div>
      )}
    </div>
  );
};

const calculateRulerDistances = (
  baseShape: Shape,
  obstacle: Obstacle
) => {
  // Get base dimensions and position
  const baseX = baseShape.position.x;
  const baseY = baseShape.position.y;
  const baseLength = baseShape.dimensions.length || 1;
  const baseWidth = baseShape.dimensions.width || baseShape.dimensions.length || 1;

  // Get obstacle dimensions and position
  const obsX = obstacle.position.x;
  const obsY = obstacle.position.y;
  const obsLength = obstacle.dimensions.length || 1;
  const obsWidth = obstacle.dimensions.width || obstacle.dimensions.length || 1;

  // Calculate boundaries
  const baseLeft = baseX - baseLength / 2;
  const baseRight = baseX + baseLength / 2;
  const baseTop = baseY - baseWidth / 2;
  const baseBottom = baseY + baseWidth / 2;

  // Obstacle boundaries
  const obsLeft = obsX - obsLength / 2;
  const obsRight = obsX + obsLength / 2;
  const obsTop = obsY - obsWidth / 2;
  const obsBottom = obsY + obsWidth / 2;

  // Calculate true distances (can be negative if inside)
  const distLeft = obsLeft - baseLeft;
  const distRight = baseRight - obsRight;
  const distTop = obsTop - baseTop;
  const distBottom = baseBottom - obsBottom;

  // For labels, always show absolute values
  return {
    left: Math.abs(distLeft),
    right: Math.abs(distRight),
    top: Math.abs(distTop),
    bottom: Math.abs(distBottom),
    closestWall: Math.min(
      Math.abs(distLeft),
      Math.abs(distRight),
      Math.abs(distTop),
      Math.abs(distBottom)
    )
  };
};

const drawGuidelines = (
  ctx: CanvasRenderingContext2D, 
  selectedObstacle: Obstacle,
  shapes: Shape[]
) => {
  const baseShape = shapes[0]; // Now shapes is available
  if (!baseShape) return;

  const distances = calculateRulerDistances(baseShape, selectedObstacle);
  
  // Use distances.left, distances.right, etc. for your ruler drawing
  // ...existing ruler drawing code...
};