import { useRef, useEffect, useState } from 'react';
import { useShapeStore, Shape, Obstacle } from '@/stores/shapeStore';

interface TopViewCanvasProps {
  shapes: Shape[];
}

export const TopViewCanvas = ({ shapes }: TopViewCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedObstacle, setDraggedObstacle] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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

    // Save context and apply transformations
    ctx.save();
    ctx.translate(canvasOffset.x, canvasOffset.y);
    ctx.scale(canvasScale, canvasScale);

    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height);

    // Draw base shapes (in lighter color to show they're the base)
    shapes.forEach((shape) => {
      drawShape(ctx, shape, false, false, 'base');
    });

    // Draw obstacles (in different color)
    obstacles.forEach((obstacle) => {
      const isSelected = selectedObstacleId === obstacle.id;
      drawObstacle(ctx, obstacle, isSelected);
    });

    ctx.restore();
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 20;
    ctx.strokeStyle = 'hsl(213, 30%, 90%)';
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= width * 2; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x - canvasOffset.x, -canvasOffset.y);
      ctx.lineTo(x - canvasOffset.x, height * 2 - canvasOffset.y);
      ctx.stroke();
    }

    for (let y = 0; y <= height * 2; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(-canvasOffset.x, y - canvasOffset.y);
      ctx.lineTo(width * 2 - canvasOffset.x, y - canvasOffset.y);
      ctx.stroke();
    }
  };

  const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape, isSelected: boolean, isHovered: boolean, type: 'base' | 'obstacle' = 'base') => {
    ctx.save();
    ctx.translate(shape.position.x * 20, shape.position.y * 20);
    ctx.rotate((shape.rotation * Math.PI) / 180);

    // Base shapes styling
    if (type === 'base') {
      ctx.fillStyle = isSelected ? 'hsl(142, 71%, 80%)' : 'hsl(142, 71%, 85%)';
      ctx.strokeStyle = 'hsl(142, 71%, 60%)';
    } else {
      ctx.fillStyle = isSelected ? 'hsl(0, 84%, 70%)' : 'hsl(0, 84%, 75%)';
      ctx.strokeStyle = 'hsl(0, 84%, 50%)';
    }
    
    ctx.lineWidth = isSelected ? 3 : 2;

    if (shape.type === 'circle') {
      const radius = (shape.dimensions.radius || 1) * 20;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (shape.type === 'triangle') {
      const length = (shape.dimensions.length || 1) * 20;
      const height = (length * Math.sqrt(3)) / 2;
      
      ctx.beginPath();
      ctx.moveTo(0, -height / 2);
      ctx.lineTo(-length / 2, height / 2);
      ctx.lineTo(length / 2, height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      const length = (shape.dimensions.length || 1) * 20;
      const width = shape.type === 'square' ? length : (shape.dimensions.width || 1) * 20;
      
      ctx.beginPath();
      ctx.rect(-length / 2, -width / 2, length, width);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawObstacle = (ctx: CanvasRenderingContext2D, obstacle: Obstacle, isSelected: boolean) => {
    ctx.save();
    ctx.translate(obstacle.position.x * 20, obstacle.position.y * 20);
    ctx.rotate((obstacle.rotation * Math.PI) / 180);

    // Obstacle styling - different color
    ctx.fillStyle = isSelected ? 'hsl(0, 84%, 70%)' : 'hsl(0, 84%, 75%)';
    ctx.strokeStyle = 'hsl(0, 84%, 50%)';
    ctx.lineWidth = isSelected ? 3 : 2;

    if (obstacle.type === 'circle') {
      const radius = (obstacle.dimensions.radius || 1) * 20;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (obstacle.type === 'triangle') {
      const length = (obstacle.dimensions.length || 1) * 20;
      const height = (length * Math.sqrt(3)) / 2;
      
      ctx.beginPath();
      ctx.moveTo(0, -height / 2);
      ctx.lineTo(-length / 2, height / 2);
      ctx.lineTo(length / 2, height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      const length = (obstacle.dimensions.length || 1) * 20;
      const width = obstacle.type === 'square' ? length : (obstacle.dimensions.width || 1) * 20;
      
      ctx.beginPath();
      ctx.rect(-length / 2, -width / 2, length, width);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  };

  const getObstacleAt = (x: number, y: number): string | null => {
    const transformedX = (x - canvasOffset.x) / canvasScale;
    const transformedY = (y - canvasOffset.y) / canvasScale;

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];
      const obstacleX = obstacle.position.x * 20;
      const obstacleY = obstacle.position.y * 20;

      let isInside = false;

      if (obstacle.type === 'circle') {
        const radius = (obstacle.dimensions.radius || 1) * 20;
        const distance = Math.sqrt(
          Math.pow(transformedX - obstacleX, 2) + Math.pow(transformedY - obstacleY, 2)
        );
        isInside = distance <= radius;
      } else if (obstacle.type === 'triangle') {
        const length = (obstacle.dimensions.length || 1) * 20;
        const height = (length * Math.sqrt(3)) / 2;
        
        const dx = transformedX - obstacleX;
        const dy = transformedY - obstacleY;
        
        isInside = Math.abs(dx) <= length / 2 && Math.abs(dy) <= height / 2;
      } else {
        const length = (obstacle.dimensions.length || 1) * 20;
        const width = obstacle.type === 'square' ? length : (obstacle.dimensions.width || 1) * 20;
        
        const dx = transformedX - obstacleX;
        const dy = transformedY - obstacleY;
        
        isInside = Math.abs(dx) <= length / 2 && Math.abs(dy) <= width / 2;
      }

      if (isInside) return obstacle.id;
    }

    return null;
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
        
        const transformedX = (x - canvasOffset.x) / canvasScale;
        const transformedY = (y - canvasOffset.y) / canvasScale;
        
        setDragOffset({
          x: transformedX - obstacle.position.x * 20,
          y: transformedY - obstacle.position.y * 20,
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

    const transformedX = (x - canvasOffset.x) / canvasScale;
    const transformedY = (y - canvasOffset.y) / canvasScale;

    const newX = (transformedX - dragOffset.x) / 20;
    const newY = (transformedY - dragOffset.y) / 20;

    updateObstacle(draggedObstacle, {
      position: { x: newX, y: newY },
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedObstacle(null);
    setDragOffset({ x: 0, y: 0 });
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
  }, [shapes, obstacles, selectedObstacleId, canvasScale, canvasOffset]);

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