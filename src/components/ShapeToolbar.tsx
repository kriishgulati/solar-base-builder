import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useShapeStore } from '@/stores/shapeStore';
import { 
  Square, 
  RectangleHorizontal, 
  Circle, 
  PenTool, 
  RotateCw, 
  Trash2, 
  Plus,
  Link,
  Download
} from 'lucide-react';

export const ShapeToolbar = () => {
  const {
    activeShapeType,
    setActiveShapeType,
    shapeMergeEnabled,
    setShapeMergeEnabled,
    addShape,
    clearCanvas,
  } = useShapeStore();

  const [dimensions, setDimensions] = useState({
    width: 10,
    length: 10,
    radius: 5,
    lineLength: 10,
  });
  const [rotation, setRotation] = useState(0);

  const handleAddShape = () => {
    const basePosition = { x: 2, y: 2 }; // 2 meters from origin
    
    let shapeData;
    switch (activeShapeType) {
      case 'rectangle':
        shapeData = {
          type: 'rectangle' as const,
          dimensions: { width: dimensions.width, length: dimensions.length },
          position: basePosition,
          rotation,
        };
        break;
      case 'square':
        shapeData = {
          type: 'square' as const,
          dimensions: { width: dimensions.width, length: dimensions.width },
          position: basePosition,
          rotation,
        };
        break;
      case 'circle':
        shapeData = {
          type: 'circle' as const,
          dimensions: { radius: dimensions.radius },
          position: basePosition,
          rotation,
        };
        break;
      case 'line':
        const angle = (rotation * Math.PI) / 180;
        const endX = basePosition.x + (dimensions.lineLength * Math.cos(angle));
        const endY = basePosition.y + (dimensions.lineLength * Math.sin(angle));
        shapeData = {
          type: 'line' as const,
          dimensions: { lineLength: dimensions.lineLength },
          position: basePosition,
          rotation,
          startPoint: basePosition,
          endPoint: { x: endX, y: endY },
        };
        break;
      default:
        return;
    }

    addShape(shapeData);
  };

  const shapeButtons = [
    { type: 'rectangle', icon: RectangleHorizontal, label: 'Rectangle' },
    { type: 'square', icon: Square, label: 'Square' },
    { type: 'circle', icon: Circle, label: 'Circle' },
    { type: 'line', icon: PenTool, label: 'Line Tool' },
  ] as const;

  return (
    <Card className="p-6 h-full bg-gradient-subtle shadow-panel">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-full"></div>
          <h2 className="text-lg font-semibold text-foreground">Shape Tools</h2>
        </div>

        <Separator />

        {/* Shape Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Shape Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {shapeButtons.map(({ type, icon: Icon, label }) => (
              <Button
                key={type}
                variant={activeShapeType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveShapeType(type)}
                className="flex flex-col gap-1 h-auto py-3"
              >
                <Icon size={20} />
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Dimensions */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-foreground">Dimensions (meters)</Label>
          
          {activeShapeType === 'circle' ? (
            <div className="space-y-2">
              <Label htmlFor="radius" className="text-xs text-muted-foreground">Radius</Label>
              <Input
                id="radius"
                type="number"
                value={dimensions.radius}
                onChange={(e) => setDimensions(prev => ({ ...prev, radius: Number(e.target.value) }))}
                className="h-9"
                min="0.1"
                step="0.1"
              />
            </div>
          ) : activeShapeType === 'line' ? (
            <div className="space-y-2">
              <Label htmlFor="lineLength" className="text-xs text-muted-foreground">Line Length</Label>
              <Input
                id="lineLength"
                type="number"
                value={dimensions.lineLength}
                onChange={(e) => setDimensions(prev => ({ ...prev, lineLength: Number(e.target.value) }))}
                className="h-9"
                min="0.1"
                step="0.1"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="width" className="text-xs text-muted-foreground">Width</Label>
                <Input
                  id="width"
                  type="number"
                  value={dimensions.width}
                  onChange={(e) => setDimensions(prev => ({ ...prev, width: Number(e.target.value) }))}
                  className="h-9"
                  min="0.1"
                  step="0.1"
                />
              </div>
              {activeShapeType === 'rectangle' && (
                <div className="space-y-2">
                  <Label htmlFor="length" className="text-xs text-muted-foreground">Length</Label>
                  <Input
                    id="length"
                    type="number"
                    value={dimensions.length}
                    onChange={(e) => setDimensions(prev => ({ ...prev, length: Number(e.target.value) }))}
                    className="h-9"
                    min="0.1"
                    step="0.1"
                  />
                </div>
              )}
            </div>
          )}

          {/* Rotation */}
          <div className="space-y-2">
            <Label htmlFor="rotation" className="text-xs text-muted-foreground">Rotation (degrees)</Label>
            <div className="flex gap-2">
              <Input
                id="rotation"
                type="number"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="h-9"
                min="0"
                max="360"
                step="1"
              />
              <Button variant="outline" size="sm" onClick={() => setRotation(0)}>
                <RotateCw size={16} />
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-3">
          <Button onClick={handleAddShape} className="w-full bg-primary hover:bg-primary/90" size="sm">
            <Plus size={16} className="mr-2" />
            Add Shape
          </Button>

          {/* Shape Merge Toggle */}
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="merge-toggle" className="text-sm text-foreground">Connect Shapes</Label>
            <Switch
              id="merge-toggle"
              checked={shapeMergeEnabled}
              onCheckedChange={setShapeMergeEnabled}
            />
          </div>

        </div>

        <Separator />

        {/* Merge Mode Indicator */}
        {shapeMergeEnabled && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm font-medium text-green-800">Connection Mode Active</div>
            <div className="text-xs text-green-600">Click two shapes to connect them</div>
          </div>
        )}

        {/* Utility Actions */}
        <div className="space-y-2">
          <Button variant="outline" onClick={clearCanvas} className="w-full" size="sm">
            <Trash2 size={16} className="mr-2" />
            Clear Canvas
          </Button>
        </div>
      </div>
    </Card>
  );
};