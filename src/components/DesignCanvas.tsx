import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Transformer, Line } from 'react-konva';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useShapeStore } from '@/stores/shapeStore';
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';
import Konva from 'konva';

const PIXELS_PER_METER = 50; // 1 meter = 50 pixels for display

export const DesignCanvas = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [selectedShapeNode, setSelectedShapeNode] = useState<Konva.Node | null>(null);

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

  // Handle shape selection
  useEffect(() => {
    if (selectedShapeId && transformerRef.current) {
      const stage = stageRef.current;
      if (stage) {
        const node = stage.findOne(`#${selectedShapeId}`);
        if (node) {
          setSelectedShapeNode(node);
          transformerRef.current.nodes([node]);
          transformerRef.current.getLayer()?.batchDraw();
        }
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
      setSelectedShapeNode(null);
    }
  }, [selectedShapeId]);

  const handleStageClick = (e: any) => {
    if (e.target === e.target.getStage()) {
      selectShape(null);
    }
  };

  const handleShapeClick = (shapeId: string, e: any) => {
    e.cancelBubble = true;
    
    // Handle shape connection if merge mode is enabled
    if (shapeMergeEnabled && selectedShapeId && selectedShapeId !== shapeId) {
      const { mergeShapes } = useShapeStore.getState();
      mergeShapes([selectedShapeId, shapeId]);
      selectShape(null);
    } else {
      selectShape(shapeId);
    }
  };

  const handleShapeChange = (shapeId: string, newAttrs: any) => {
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    const updates: any = {
      position: {
        x: newAttrs.x / PIXELS_PER_METER,
        y: newAttrs.y / PIXELS_PER_METER,
      },
      rotation: newAttrs.rotation || 0,
    };

    // Handle dimension changes
    if (shape.type === 'rectangle') {
      updates.dimensions = {
        length: newAttrs.width / PIXELS_PER_METER,
        width: newAttrs.height / PIXELS_PER_METER,
      };
    } else if (shape.type === 'square' || shape.type === 'triangle') {
      updates.dimensions = {
        length: newAttrs.width / PIXELS_PER_METER,
      };
    } else if (shape.type === 'circle') {
      updates.dimensions = {
        radius: newAttrs.radius / PIXELS_PER_METER,
      };
    }

    updateShape(shapeId, updates);
  };

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

  const renderShape = (shape: any) => {
    const commonProps = {
      id: shape.id,
      key: shape.id,
      x: shape.position.x * PIXELS_PER_METER, // center-based
      y: shape.position.y * PIXELS_PER_METER, // center-based
      rotation: shape.rotation,
      draggable: true,
      onClick: (e: any) => handleShapeClick(shape.id, e),
      onDragEnd: (e: any) => handleShapeChange(shape.id, e.target.attrs),
      onTransformEnd: (e: any) => handleShapeChange(shape.id, e.target.attrs),
      fill: shape.merged 
        ? 'hsl(142 76% 55% / 0.8)' 
        : selectedShapeId === shape.id 
          ? 'hsl(35 91% 55%)' 
          : 'hsl(35 91% 55% / 0.8)',
      stroke: shape.merged 
        ? 'hsl(142 76% 55%)' 
        : selectedShapeId === shape.id 
          ? 'hsl(213 100% 60%)' 
          : 'hsl(35 91% 55%)',
      strokeWidth: selectedShapeId === shape.id ? 3 : 2,
    };

    switch (shape.type) {
      case 'rectangle':
        return (
          <Rect
            {...commonProps}
            width={(shape.dimensions.length || 0) * PIXELS_PER_METER}
            height={(shape.dimensions.width || 0) * PIXELS_PER_METER}
            offsetX={((shape.dimensions.length || 0) * PIXELS_PER_METER) / 2}
            offsetY={((shape.dimensions.width || 0) * PIXELS_PER_METER) / 2}
          />
        );
      case 'square':
      case 'triangle':
        return (
          <Rect
            {...commonProps}
            width={(shape.dimensions.length || 0) * PIXELS_PER_METER}
            height={(shape.dimensions.length || 0) * PIXELS_PER_METER}
            offsetX={((shape.dimensions.length || 0) * PIXELS_PER_METER) / 2}
            offsetY={((shape.dimensions.length || 0) * PIXELS_PER_METER) / 2}
          />
        );
      case 'circle':
        return (
          <Circle
            {...commonProps}
            radius={(shape.dimensions.radius || 0) * PIXELS_PER_METER}
            // Konva Circle uses center at x,y by default
          />
        );
      default:
        return null;
    }
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

      {/* Grid Background */}
      <div className="absolute inset-0">
        <svg width="100%" height="100%" className="opacity-20">
          <defs>
            <pattern
              id="grid"
              width={PIXELS_PER_METER * canvasScale}
              height={PIXELS_PER_METER * canvasScale}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${PIXELS_PER_METER * canvasScale} 0 L 0 0 0 ${PIXELS_PER_METER * canvasScale}`}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Konva Canvas */}
      <Stage
        ref={stageRef}
        width={800}
        height={600}
        scaleX={canvasScale}
        scaleY={canvasScale}
        offsetX={canvasOffset.x}
        offsetY={canvasOffset.y}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        <Layer>
          {/* Render connection lines first */}
          {shapes.map(shape => 
            shape.connectedTo.map(connectedId => {
              const connectedShape = shapes.find(s => s.id === connectedId);
              if (!connectedShape) return null;
              
              return (
                <Line
                  key={`${shape.id}-${connectedId}`}
                  points={[
                    shape.position.x * PIXELS_PER_METER,
                    shape.position.y * PIXELS_PER_METER,
                    connectedShape.position.x * PIXELS_PER_METER,
                    connectedShape.position.y * PIXELS_PER_METER,
                  ]}
                  stroke="hsl(142 76% 55%)"
                  strokeWidth={3}
                  dash={[5, 5]}
                />
              );
            })
          ).flat()}
          
          {shapes.map(renderShape)}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Minimum size constraints
              if (newBox.width < 20 || newBox.height < 20) {
                return oldBox;
              }
              return newBox;
            }}
            anchorStroke="hsl(213 100% 60%)"
            anchorFill="hsl(35 91% 55%)"
            borderStroke="hsl(213 100% 60%)"
            borderDash={[3, 3]}
          />
        </Layer>
      </Stage>
    </Card>
  );
};