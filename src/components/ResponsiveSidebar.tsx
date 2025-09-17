import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Grid, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResponsiveSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showGridToggle?: boolean;
  gridVisible?: boolean;
  onToggleGrid?: () => void;
  className?: string;
}

export const ResponsiveSidebar: React.FC<ResponsiveSidebarProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showGridToggle = false,
  gridVisible = true,
  onToggleGrid,
  className
}) => {
  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:block w-1/5 p-4 border-r bg-background",
        className
      )}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {showGridToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleGrid}
              className={cn(
                "h-8 w-8 p-0",
                gridVisible ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Grid className="h-4 w-4" />
            </Button>
          )}
        </div>
        {children}
      </div>

      {/* Mobile Bottom Sheet */}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[70vh] p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                {title}
              </SheetTitle>
              <div className="flex items-center gap-2">
                {showGridToggle && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleGrid}
                    className={cn(
                      "h-8 w-8 p-0",
                      gridVisible ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
