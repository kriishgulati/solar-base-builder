import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Building, Download, Eye } from 'lucide-react';

interface Export3DModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (height: number) => void;
}

export const Export3DModal = ({ isOpen, onClose, onExport }: Export3DModalProps) => {
  const [buildingHeight, setBuildingHeight] = useState(3);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(buildingHeight);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" />
            Export to 3D Model
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="height" className="text-sm font-medium">
              Building Height (meters)
            </Label>
            <Input
              id="height"
              type="number"
              value={buildingHeight}
              onChange={(e) => setBuildingHeight(Number(e.target.value))}
              min="0.1"
              step="0.1"
              placeholder="Enter building height..."
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              This will be the height of the extruded 3D building model
            </p>
          </div>

          <Separator />

          <div className="bg-secondary/50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview Information
            </h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Your 2D floor plan will be extruded to create a 3D building</p>
              <p>• The roof area will be available for solar panel placement</p>
              <p>• You can rotate and zoom the 3D model for better visualization</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isExporting || buildingHeight <= 0}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isExporting ? (
                <>Generating...</>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export 3D
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};