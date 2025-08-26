import { useEffect, useState } from 'react';
import { useShapeStore } from '@/stores/shapeStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RotateCcw, Trash2, Plus, Copy, ZoomIn, ZoomOut } from 'lucide-react';

interface ObstacleToolbarProps {
  onClose: () => void;
  baseHeight: number;
}

export const ObstacleToolbar = ({ onClose, baseHeight }: ObstacleToolbarProps) => {
  const {
    activeShapeType,
    setActiveShapeType,
    addObstacle,
    clearObstacles,
    obstacles,
    selectedObstacleId,
    updateObstacle,
    selectObstacle,
  copyObstacle,
  zoomIn,
  zoomOut,
  recenterCanvas,
  recenterOnSelectedObstacle,
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
        length: selectedObstacle.type === 'solarPanel' ? 2 : (selectedObstacle.dimensions.length ?? 1),
        width: selectedObstacle.type === 'solarPanel' ? 1 : (selectedObstacle.dimensions.width ?? 1),
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
      // Preserve square aspect ratio for obstacles of type 'square'
      let updatedDimensions: any = {};

      if (selectedObstacle.type === 'solarPanel') {
        updatedDimensions = { length: 2, width: 1 };
      } else if (selectedObstacle.type === 'square') {
        updatedDimensions = { length: dimensions.length, width: dimensions.length };
      } else if (selectedObstacle.type === 'circle') {
        updatedDimensions = { radius: dimensions.radius };
      } else if (selectedObstacle.type === 'triangle') {
        updatedDimensions = { length: dimensions.length };
      } else {
        updatedDimensions = { length: dimensions.length, width: dimensions.width };
      }

      updateObstacle(selectedObstacle.id, {
        ...selectedObstacle,
        dimensions: {
          ...selectedObstacle.dimensions,
          ...updatedDimensions,
        },
        rotation,
        height,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions.length, dimensions.width, dimensions.radius, rotation, height]);

  // Use baseHeight when creating obstacles
  const handleAddObstacle = () => {
    if (activeShapeType === 'solarPanel') {
      addObstacle({
        type: 'solarPanel',
        dimensions: { length: 2, width: 1 },
        position: { x: 0, y: 0 },
        rotation: rotation,
        height: height,
        totalHeight: height + baseHeight
      });
    } else {
      addObstacle({
        type: activeShapeType,
        dimensions,
        position: { x: 0, y: 0 }, // center
        rotation: rotation,
        height: height,                // obstacle's own height
        totalHeight: height + baseHeight  // combined height for 3D export
      });
    }
  };

  const resetRotation = () => setRotation(0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Add Obstacles</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Place obstacles on or around your base structure
        </p>
      </div>

      {/* Zoom & Recenter Controls */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">View</Label>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => zoomIn()} title="Zoom In">
            <ZoomIn size={14} />
          </Button>
          <Button size="sm" onClick={() => zoomOut()} title="Zoom Out">
            <ZoomOut size={14} />
          </Button>
          <Button size="sm" onClick={() => recenterCanvas()} title="Recenter">
            <RotateCcw size={14} />
          </Button>
          <Button size="sm" onClick={() => recenterOnSelectedObstacle()} title="Center on Selected">
            <RotateCcw size={14} />
          </Button>
        </div>
      </div>

      {/* Shape Type Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Shape Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'rectangle', label: 'Rectangle' },
            { key: 'square', label: 'Square' },
            { key: 'circle', label: 'Circle' },
            { key: 'triangle', label: 'Triangle' },
            { key: 'solarPanel', label: 'Solar Panel' },
          ].map((shape) => (
            <Button
              key={shape.key}
              variant={activeShapeType === (shape.key as any) ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveShapeType(shape.key as any);
                // Do not modify local dimensions of an already selected obstacle when switching types
              }}
              className="capitalize"
            >
              {shape.label}
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

          {activeShapeType === 'solarPanel' && (
            <div className="text-xs text-muted-foreground">
              Fixed base: 1.0m × 2.0m
            </div>
          )}
        </div>
      </div>

      {/* Height */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Height (will be added to base height: {baseHeight}m)
        </Label>
        <Input
          type="number"
          value={height}
          onChange={(e) => setHeight(Number(e.target.value))}
          min="0.1"
          step="0.1"
          className="h-9"
        />
        <div className="text-xs text-muted-foreground">
          Total height will be: {(baseHeight + height).toFixed(1)}m
        </div>
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

        {selectedObstacle && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => copyObstacle(selectedObstacle.id)} className="flex-1">
              <Copy size={16} className="mr-2" />
              Copy Obstacle
            </Button>
            <Button variant="ghost" onClick={() => selectObstacle(null)}>
              <Trash2 size={16} />
            </Button>
          </div>
        )}
      </div>

      {obstacles.length > 0 && (
        <div className="text-xs text-muted-foreground pt-2 border-t">
          {obstacles.length} obstacle{obstacles.length !== 1 ? 's' : ''} placed
        </div>
      )}
    </div>
  );
};