import { useEffect, useState } from 'react';
import { useShapeStore } from '@/stores/shapeStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RotateCcw, Trash2, Plus } from 'lucide-react';

export const ObstacleToolbar = () => {
  const {
    activeShapeType,
    setActiveShapeType,
    addObstacle,
    clearObstacles,
    obstacles,
    selectedObstacleId,
    updateObstacle,
    selectObstacle,
  } = useShapeStore();

  const selectedObstacle = obstacles.find(o => o.id === selectedObstacleId);

  const [dimensions, setDimensions] = useState({
    length: 1,
    width: 1,
    radius: 1,
  });
  const [rotation, setRotation] = useState(0);
  const [height, setHeight] = useState(2);

  // Sync local state with selected obstacle
  useEffect(() => {
    if (selectedObstacle) {
      setDimensions({
        length: selectedObstacle.dimensions.length ?? 1,
        width: selectedObstacle.dimensions.width ?? 1,
        radius: selectedObstacle.dimensions.radius ?? 1,
      });
      setRotation(selectedObstacle.rotation ?? 0);
      setHeight(selectedObstacle.height ?? 2);
      setActiveShapeType(selectedObstacle.type);
    }
  }, [selectedObstacleId]);

  // Update obstacle in real time when dimensions or rotation change
  useEffect(() => {
    if (selectedObstacle) {
      updateObstacle(selectedObstacle.id, {
        ...selectedObstacle,
        dimensions: {
          ...selectedObstacle.dimensions,
          length: dimensions.length,
          width: dimensions.width,
          radius: dimensions.radius,
        },
        rotation,
        height,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions.length, dimensions.width, dimensions.radius, rotation, height]);

  const handleAddObstacle = () => {
    const obstacleData = {
      type: activeShapeType,
      dimensions: {
        ...(activeShapeType === 'circle' ? { radius: dimensions.radius } : {}),
        ...(activeShapeType === 'square' ? { length: dimensions.length } : {}),
        ...(activeShapeType === 'rectangle' ? { length: dimensions.length, width: dimensions.width } : {}),
        ...(activeShapeType === 'triangle' ? { length: dimensions.length } : {}),
      },
      position: { x: 5, y: 5 }, // Default position
      rotation,
      height,
    };

    addObstacle(obstacleData);
  };

  const resetRotation = () => setRotation(0);

  return (
    <Card className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Add Obstacles</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Place obstacles on or around your base structure
        </p>
      </div>

      {/* Shape Type Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Shape Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['rectangle', 'square', 'circle', 'triangle'] as const).map((shape) => (
            <Button
              key={shape}
              variant={activeShapeType === shape ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveShapeType(shape)}
              className="capitalize"
            >
              {shape}
            </Button>
          ))}
        </div>
      </div>

      {/* Dimensions */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Dimensions</Label>
        <div className="space-y-2">
          {activeShapeType === 'circle' && (
            <div>
              <Label htmlFor="radius" className="text-xs text-muted-foreground">Radius</Label>
              <Input
                id="radius"
                type="number"
                min="0.1"
                step="0.1"
                value={dimensions.radius}
                onChange={(e) => setDimensions(prev => ({ ...prev, radius: parseFloat(e.target.value) || 1 }))}
                className="h-8"
              />
            </div>
          )}
          
          {(activeShapeType === 'rectangle' || activeShapeType === 'square' || activeShapeType === 'triangle') && (
            <div>
              <Label htmlFor="length" className="text-xs text-muted-foreground">Length</Label>
              <Input
                id="length"
                type="number"
                min="0.1"
                step="0.1"
                value={dimensions.length}
                onChange={(e) => setDimensions(prev => ({ ...prev, length: parseFloat(e.target.value) || 1 }))}
                className="h-8"
              />
            </div>
          )}
          
          {activeShapeType === 'rectangle' && (
            <div>
              <Label htmlFor="width" className="text-xs text-muted-foreground">Width</Label>
              <Input
                id="width"
                type="number"
                min="0.1"
                step="0.1"
                value={dimensions.width}
                onChange={(e) => setDimensions(prev => ({ ...prev, width: parseFloat(e.target.value) || 1 }))}
                className="h-8"
              />
            </div>
          )}
        </div>
      </div>

      {/* Height */}
      <div className="space-y-2">
        <Label htmlFor="height" className="text-sm font-medium text-foreground">Height (m)</Label>
        <Input
          id="height"
          type="number"
          min="0.1"
          step="0.1"
          value={height}
          onChange={(e) => setHeight(parseFloat(e.target.value) || 2)}
          className="h-8"
        />
      </div>

      {/* Rotation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="rotation" className="text-sm font-medium text-foreground">Rotation (°)</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRotation((prev) => (prev + 90) % 360)}
            className="h-6 w-6 p-0"
            title="Rotate 90°"
          >
            <RotateCcw size={12} />
          </Button>
        </div>
        <Input
          id="rotation"
          type="number"
          min="0"
          max="359"
          step="1"
          value={rotation}
          onChange={(e) => setRotation(parseInt(e.target.value) || 0)}
          className="h-8"
        />
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <Button onClick={handleAddObstacle} className="w-full">
          <Plus size={16} className="mr-2" />
          Add Obstacle
        </Button>
        
        <Button 
          variant="outline" 
          onClick={clearObstacles}
          className="w-full"
          disabled={obstacles.length === 0}
        >
          <Trash2 size={16} className="mr-2" />
          Clear All Obstacles
        </Button>
      </div>

      {obstacles.length > 0 && (
        <div className="text-xs text-muted-foreground pt-2 border-t">
          {obstacles.length} obstacle{obstacles.length !== 1 ? 's' : ''} placed
        </div>
      )}
    </Card>
  );
};