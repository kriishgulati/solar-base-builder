import React, { useState } from 'react';
import { Menu, X, Shapes, Zap, Eye, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useShapeStore } from '@/stores/shapeStore';
import { cn } from '@/lib/utils';

interface MobileMenuProps {
  onToggleObstacleMode: () => void;
  onExportTo3D: () => void;
  onShow3D: () => void;
  showObstacleMode: boolean;
  show3D: boolean;
  shapesCount: number;
  obstaclesCount: number;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  onToggleObstacleMode,
  onExportTo3D,
  onShow3D,
  showObstacleMode,
  show3D,
  shapesCount,
  obstaclesCount
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      id: 'shapes',
      label: 'Base Shapes',
      icon: Shapes,
      count: shapesCount,
      active: !showObstacleMode && !show3D,
      onClick: () => {
        if (showObstacleMode) onToggleObstacleMode();
        if (show3D) onShow3D();
        setIsOpen(false);
      }
    },
    {
      id: 'obstacles',
      label: 'Obstacles',
      icon: Zap,
      count: obstaclesCount,
      active: showObstacleMode && !show3D,
      onClick: () => {
        if (!showObstacleMode) onToggleObstacleMode();
        if (show3D) onShow3D();
        setIsOpen(false);
      }
    },
    {
      id: '3d',
      label: '3D Viewer',
      icon: Eye,
      active: show3D,
      onClick: () => {
        if (!show3D) onShow3D();
        setIsOpen(false);
      }
    }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="md:hidden h-10 w-10"
          aria-label="Open mobile menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shapes className="h-5 w-5 text-primary" />
            Solar Designer
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{shapesCount}</div>
              <div className="text-sm text-muted-foreground">Base Shapes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{obstaclesCount}</div>
              <div className="text-sm text-muted-foreground">Obstacles</div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={item.active ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start h-12 text-left",
                    item.active && "bg-primary text-primary-foreground"
                  )}
                  onClick={item.onClick}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span className="flex-1">{item.label}</span>
                  {item.count !== undefined && (
                    <Badge 
                      variant={item.active ? "secondary" : "outline"}
                      className="ml-2"
                    >
                      {item.count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t space-y-2">
            {!show3D && (
              <Button
                onClick={() => {
                  onExportTo3D();
                  setIsOpen(false);
                }}
                className="w-full"
                disabled={shapesCount === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                Export to 3D
              </Button>
            )}
            
            {show3D && (
              <Button
                onClick={() => {
                  onShow3D();
                  setIsOpen(false);
                }}
                variant="outline"
                className="w-full"
              >
                <Shapes className="h-4 w-4 mr-2" />
                Back to 2D
              </Button>
            )}
          </div>

          {/* Grid Toggle */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="text-sm font-medium">Grid Visibility</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Always On
              </Badge>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
