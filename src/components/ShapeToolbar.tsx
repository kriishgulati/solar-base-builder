import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useShapeStore } from "@/stores/shapeStore";
import {
  Square,
  RectangleHorizontal,
  Circle,
  Triangle,
  RotateCw,
  Trash2,
  Plus,
} from "lucide-react";
import { Copy } from "lucide-react";

export const ShapeToolbar = ({ isDragging = false }) => {
  const {
    activeShapeType,
    setActiveShapeType,
    addShape,
    clearCanvas,
    selectedShapeId,
    shapes,
    updateShape,
    selectShape,
    deleteShape,
    copyShape,
    selectedShapeIds,
    createGroup,
    groups,
    getGroupIdForShape,
    ungroup,
  } = useShapeStore();

  const [dimensions, setDimensions] = useState({
    length: 10,
    width: 10,
    radius: 5,
  });
  const [rotation, setRotation] = useState(0);

  const selectedShape = shapes.find((s) => s.id === selectedShapeId);

  // Sync local state with selected shape
  useEffect(() => {
    if (selectedShape) {
      setDimensions({
        length: selectedShape.dimensions.length ?? 10,
        width: selectedShape.dimensions.width ?? 10,
        radius: selectedShape.dimensions.radius ?? 5,
      });
      setRotation(selectedShape.rotation ?? 0);
      setActiveShapeType(selectedShape.type);
    }
  }, [selectedShapeId]);

  // Update shape in real time
  useEffect(() => {
    if (selectedShape && !isDragging) {
      let updatedDimensions: any = {};

      if (selectedShape.type === "square") {
        updatedDimensions = {
          length: dimensions.length,
          width: dimensions.length,
        };
      } else if (selectedShape.type === "circle") {
        updatedDimensions = { radius: dimensions.radius };
      } else if (selectedShape.type === "triangle") {
        updatedDimensions = { length: dimensions.length };
      } else {
        updatedDimensions = {
          length: dimensions.length,
          width: dimensions.width,
        };
      }

      updateShape(selectedShape.id, {
        ...selectedShape,
        dimensions: {
          ...selectedShape.dimensions,
          ...updatedDimensions,
        },
        rotation,
      });
    }
  }, [
    dimensions.length,
    dimensions.width,
    dimensions.radius,
    rotation,
    isDragging,
  ]);

  const handleAddShape = () => {
    const basePosition = { x: 0, y: 0 };

    let shapeData;
    switch (activeShapeType) {
      case "rectangle":
        shapeData = {
          type: "rectangle" as const,
          dimensions: { length: dimensions.length, width: dimensions.width },
          position: basePosition,
          rotation,
        };
        break;
      case "square":
        shapeData = {
          type: "square" as const,
          dimensions: { length: dimensions.length },
          position: basePosition,
          rotation,
        };
        break;
      case "circle":
        shapeData = {
          type: "circle" as const,
          dimensions: { radius: dimensions.radius },
          position: basePosition,
          rotation,
        };
        break;
      case "triangle":
        shapeData = {
          type: "triangle" as const,
          dimensions: { length: dimensions.length },
          position: basePosition,
          rotation,
        };
        break;
      default:
        return;
    }

    addShape(shapeData);
  };

  const shapeButtons = [
    { type: "rectangle", icon: RectangleHorizontal, label: "Rectangle" },
    { type: "square", icon: Square, label: "Square" },
    { type: "circle", icon: Circle, label: "Circle" },
    { type: "triangle", icon: Triangle, label: "Triangle" },
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
          <Label className="text-sm font-medium text-foreground">
            Shape Type
          </Label>
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
          <Label className="text-sm font-medium text-foreground">
            Dimensions (meters)
          </Label>

          {activeShapeType === "circle" ? (
            <div className="space-y-2">
              <Label htmlFor="radius" className="text-xs text-muted-foreground">
                Radius
              </Label>
              <Input
                id="radius"
                type="number"
                value={dimensions.radius}
                onChange={(e) =>
                  setDimensions((prev) => ({
                    ...prev,
                    radius: Number(e.target.value),
                  }))
                }
                className="h-9"
                min="0.1"
                step="0.1"
              />
            </div>
          ) : activeShapeType === "triangle" || activeShapeType === "square" ? (
            <div className="space-y-2">
              <Label htmlFor="length" className="text-xs text-muted-foreground">
                Length
              </Label>
              <Input
                id="length"
                type="number"
                value={dimensions.length}
                onChange={(e) =>
                  setDimensions((prev) => ({
                    ...prev,
                    length: Number(e.target.value),
                  }))
                }
                className="h-9"
                min="0.1"
                step="0.1"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label
                  htmlFor="length"
                  className="text-xs text-muted-foreground"
                >
                  Length
                </Label>
                <Input
                  id="length"
                  type="number"
                  value={dimensions.length}
                  onChange={(e) =>
                    setDimensions((prev) => ({
                      ...prev,
                      length: Number(e.target.value),
                    }))
                  }
                  className="h-9"
                  min="0.1"
                  step="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="width"
                  className="text-xs text-muted-foreground"
                >
                  Width
                </Label>
                <Input
                  id="width"
                  type="number"
                  value={dimensions.width}
                  onChange={(e) =>
                    setDimensions((prev) => ({
                      ...prev,
                      width: Number(e.target.value),
                    }))
                  }
                  className="h-9"
                  min="0.1"
                  step="0.1"
                />
              </div>
            </div>
          )}

          {/* Rotation */}
          <div className="space-y-2">
            <Label htmlFor="rotation" className="text-xs text-muted-foreground">
              Rotation (degrees)
            </Label>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
              >
                <RotateCw size={16} />
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleAddShape}
            className="w-full bg-primary hover:bg-primary/90"
            size="sm"
          >
            <Plus size={16} className="mr-2" />
            Add Shape
          </Button>

          {selectedShape && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => copyShape(selectedShape.id)}
                className="flex-1"
                size="sm"
              >
                <Copy size={16} className="mr-2" />
                Copy Shape
              </Button>
              <Button
                variant="ghost"
                onClick={() => deleteShape(selectedShape.id)}
                size="sm"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          )}

          {/* Group / Ungroup */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={(selectedShapeIds?.length || 0) < 2}
              onClick={() => {
                if ((selectedShapeIds?.length || 0) >= 2) {
                  createGroup(selectedShapeIds);
                }
              }}
              className="flex-1"
            >
              Group Shapes
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={
                !selectedShapeId || !getGroupIdForShape(selectedShapeId)
              }
              onClick={() => {
                if (selectedShapeId) {
                  const gid = getGroupIdForShape(selectedShapeId);
                  if (gid) ungroup(gid);
                }
              }}
              className="flex-1"
            >
              Ungroup
            </Button>
          </div>

          {/* Clear Canvas */}
          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={clearCanvas}
              className="w-full"
              size="sm"
            >
              <Trash2 size={16} className="mr-2" />
              Clear Canvas
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
