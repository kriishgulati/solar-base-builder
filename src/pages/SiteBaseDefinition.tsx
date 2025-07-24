import { useState } from 'react';
import { ShapeToolbar } from '@/components/ShapeToolbar';
import { DesignCanvas } from '@/components/DesignCanvas';
import { Export3DModal } from '@/components/Export3DModal';
import { ThreeScene } from '@/components/ThreeScene';
import { useShapeStore } from '@/stores/shapeStore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sun } from 'lucide-react';

export const SiteBaseDefinition = () => {
  const [showExportModal, setShowExportModal] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [buildingHeight, setBuildingHeight] = useState(3);
  
  const { shapes } = useShapeStore();

  const handleExportTo3D = (height: number) => {
    setBuildingHeight(height);
    setShow3D(true);
    return Promise.resolve();
  };

  const handleBackTo2D = () => {
    setShow3D(false);
  };

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
            <div className="text-sm text-muted-foreground">
              Height: {buildingHeight}m | Shapes: {shapes.length}
            </div>
          </div>
        </div>

        {/* 3D Scene */}
        <div className="h-[calc(100vh-80px)]">
          <ThreeScene shapes={shapes} buildingHeight={buildingHeight} />
        </div>
      </div>
    );
  }

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
        {/* Left Panel - Shape Tools */}
        <div className="w-80 p-4 border-r bg-background">
          <ShapeToolbar />
        </div>

        {/* Right Panel - Canvas */}
        <div className="flex-1 p-4">
          <DesignCanvas />
        </div>
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