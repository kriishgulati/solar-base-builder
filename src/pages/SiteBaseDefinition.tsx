import { useState } from 'react';
import { ShapeToolbar } from '@/components/ShapeToolbar';
import { ObstacleToolbar } from '@/components/ObstacleToolbar';
import { SimpleCanvas } from '@/components/SimpleCanvas';
import { TopViewCanvas } from '@/components/TopViewCanvas';
import { Export3DModal } from '@/components/Export3DModal';
import { ThreeScene } from '@/components/ThreeScene';
import { useShapeStore } from '@/stores/shapeStore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sun, Plus } from 'lucide-react';
import React from 'react';

export const SiteBaseDefinition = () => {
  const [showExportModal, setShowExportModal] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [showObstacleMode, setShowObstacleMode] = useState(false);
  const { shapes, obstacles, setObstacleMode, baseHeight, setBaseHeight } = useShapeStore(); // Get baseHeight from store

  const handleExportTo3D = (height: number) => {
    setBaseHeight(height);
    setShow3D(true);
    return Promise.resolve();
  };

  const handleBackTo2D = () => {
    setShow3D(false);
    setShowObstacleMode(false);
    setObstacleMode(false);
  };

  const handleAddObstacles = () => {
    setShowObstacleMode(true);
    setObstacleMode(true);
  };

  const handleExportFinal3D = () => {
    setShowObstacleMode(false);
    setObstacleMode(false);
  };

  // Single return statement with conditional rendering
  if (show3D) {
    return (
      <div className="h-screen bg-gradient-subtle">
        {/* 3D View Header */}
        <div className="bg-card border-b shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleBackTo2D}>
                <ArrowLeft size={16} className="mr-2" />
                Back to 2D Editor
              </Button>
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-bold text-foreground">3D Building Model</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleAddObstacles}
                variant="outline"
                className="bg-primary/10 border-primary text-primary hover:bg-primary/20"
              >
                <Plus size={16} className="mr-2" />
                Add Obstacles
              </Button>
              <div className="text-sm text-muted-foreground">
                Height: {baseHeight}m | Shapes: {shapes.length}
                {obstacles.length > 0 && ` | Obstacles: ${obstacles.length}`}
              </div>
            </div>
          </div>
        </div>
        {/* 3D Scene */}
        <div className="h-[calc(100vh-80px)]">
          <ThreeScene 
            shapes={shapes} 
            obstacles={obstacles} 
            buildingHeight={baseHeight} // Pass the base height
          />
        </div>
      </div>
    );
  }

  // 2D Editor (Base or Obstacle Mode)
  return (
    <div className="h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="bg-card border-b shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Solar Site Designer</h1>
            <span className="text-sm text-muted-foreground ml-2">Site Base Definition</span>
          </div>
          <Button
            onClick={() => setShowExportModal(true)}
            className="bg-primary hover:bg-primary/90"
            disabled={shapes.length === 0}
          >
            Export to 3D
          </Button>
        </div>
      </div>
      {/* Main Content */}
      <div className="h-[calc(100vh-80px)] flex">
        {showObstacleMode ? (
          // Obstacle placement workflow
          <>
            <div className="w-1/5 p-4 border-r bg-background">
              <ObstacleToolbar 
                onClose={() => setShowObstacleMode(false)}
                baseHeight={baseHeight}
              />
            </div>
            <div className="w-4/5 p-4">
              <TopViewCanvas shapes={shapes} />
            </div>
          </>
        ) : (
          // Base creation workflow
          <>
            <div className="w-1/5 p-4 border-r bg-background">
              <ShapeToolbar />
            </div>
            <div className="w-4/5 p-4">
              <SimpleCanvas setShowObstacleMode={setShowObstacleMode} />
            </div>
          </>
        )}
      </div>
      {/* Export Modal */}
      <Export3DModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportTo3D}
      />
    </div>
  );
};