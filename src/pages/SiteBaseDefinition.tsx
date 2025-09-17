import { useState } from 'react';
import { ShapeToolbar } from '@/components/ShapeToolbar';
import { ObstacleToolbar } from '@/components/ObstacleToolbar';
import { SimpleCanvas } from '@/components/SimpleCanvas';
import { TopViewCanvas } from '@/components/TopViewCanvas';
import { Export3DModal } from '@/components/Export3DModal';
import { ThreeScene } from '@/components/ThreeScene';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { MobileMenu } from '@/components/MobileMenu';
import { ResponsiveSidebar } from '@/components/ResponsiveSidebar';
import { useShapeStore } from '@/stores/shapeStore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sun, Plus } from 'lucide-react';
import React from 'react';

export const SiteBaseDefinition = () => {
  const [showExportModal, setShowExportModal] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [showObstacleMode, setShowObstacleMode] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
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
    setShow3D(false); // Exit 3D view
    setShowObstacleMode(true); // Show obstacle mode
    setObstacleMode(true); // Set store to obstacle mode
  };

  const handleExportFinal3D = () => {
    setShowObstacleMode(false);
    setObstacleMode(false);
  };

  // Single return statement with conditional rendering
  if (show3D) {
    return (
      <div className="layout-container bg-gradient-subtle">
        {/* 3D View Header - Consistent across all devices */}
        <div className="layout-header bg-card border-b shadow-sm p-2 md:p-4">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
              <Button variant="outline" size="sm" onClick={handleBackTo2D}>
                <ArrowLeft size={16} className="mr-2" />
                <span className="hidden sm:inline">Back to 2D Editor</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                <h1 className="text-lg md:text-xl font-bold text-foreground no-wrap">3D Building Model</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              <Button
                onClick={handleAddObstacles}
                variant="outline"
                size="sm"
                className="bg-primary/10 border-primary text-primary hover:bg-primary/20 no-wrap"
              >
                <Plus size={16} className="mr-2" />
                <span className="hidden sm:inline">Add Obstacles</span>
                <span className="sm:hidden">Add</span>
              </Button>
              <div className="text-xs md:text-sm text-muted-foreground hidden lg:block no-wrap">
                Height: {baseHeight}m | Shapes: {shapes.length}
                {obstacles.length > 0 && ` | Obstacles: ${obstacles.length}`}
              </div>
              <DarkModeToggle variant="futuristic" size="sm" />
            </div>
          </div>
        </div>

        {/* 3D Scene - Consistent height */}
        <div className="flex-1 overflow-hidden">
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
    <div className="layout-container bg-gradient-subtle">
      {/* Header - Consistent across all devices */}
      <div className="layout-header bg-card border-b shadow-sm p-2 md:p-4">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Sun className="w-5 h-5 md:w-6 md:h-6 text-primary flex-shrink-0" />
            <h1 className="text-lg md:text-2xl font-bold text-foreground no-wrap">Solar Site Designer</h1>
            <span className="hidden lg:inline text-sm text-muted-foreground ml-2 flex-shrink-0 no-wrap">Site Base Definition</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            {/* Mobile Menu - Only show on very small screens */}
            <div className="block lg:hidden">
              <MobileMenu
                onToggleObstacleMode={() => setShowObstacleMode(!showObstacleMode)}
                onExportTo3D={() => setShowExportModal(true)}
                onShow3D={() => setShow3D(true)}
                showObstacleMode={showObstacleMode}
                show3D={show3D}
                shapesCount={shapes.length}
                obstaclesCount={obstacles.length}
              />
            </div>
            
            {/* Desktop Controls - Show on larger screens */}
            <div className="hidden lg:flex items-center gap-4">
              <Button
                onClick={() => setShowExportModal(true)}
                className="bg-primary hover:bg-primary/90"
                disabled={shapes.length === 0}
              >
                Export to 3D
              </Button>
              <DarkModeToggle variant="futuristic" size="md" />
            </div>
            
            {/* Tablet/Mobile Controls */}
            <div className="flex lg:hidden items-center gap-2">
              <Button
                onClick={() => setShowExportModal(true)}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-xs no-wrap"
                disabled={shapes.length === 0}
              >
                Export to 3D
              </Button>
              <DarkModeToggle variant="futuristic" size="sm" />
            </div>
          </div>
        </div>
      </div>
      {/* Main Content - Consistent layout across all devices */}
      <div className="layout-content">
        {showObstacleMode ? (
          // Obstacle placement workflow
          <>
            {/* Sidebar - Always visible, consistent width */}
            <div className="layout-sidebar p-2 md:p-4 border-r bg-background">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground no-wrap">Obstacle Tools</h2>
              </div>
              <ObstacleToolbar 
                onClose={() => setShowObstacleMode(false)}
                baseHeight={baseHeight}
              />
            </div>
            {/* Canvas Area */}
            <div className="layout-main p-2 md:p-4">
              <TopViewCanvas shapes={shapes} />
            </div>
          </>
        ) : (
          // Base creation workflow
          <>
            {/* Sidebar - Always visible, consistent width */}
            <div className="layout-sidebar p-2 md:p-4 border-r bg-background">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground no-wrap">Shape Tools</h2>
              </div>
              <ShapeToolbar />
            </div>
            {/* Canvas Area */}
            <div className="layout-main p-2 md:p-4">
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