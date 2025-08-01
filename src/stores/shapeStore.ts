import { create } from 'zustand';

export interface Shape {
  id: string;
  type: 'rectangle' | 'square' | 'circle' | 'line';
  dimensions: {
    width?: number;
    length?: number;
    radius?: number;
    lineLength?: number;
  };
  position: {
    x: number;
    y: number;
  };
  rotation: number;
  startPoint?: { x: number; y: number }; // For line shapes
  endPoint?: { x: number; y: number }; // For line shapes
  connectedTo: string[];
  merged: boolean;
}

interface ShapeStore {
  shapes: Shape[];
  selectedShapeId: string | null;
  activeShapeType: 'rectangle' | 'square' | 'circle' | 'line';
  canvasScale: number;
  canvasOffset: { x: number; y: number };
  shapeMergeEnabled: boolean;
  
  // Actions
  addShape: (shape: Omit<Shape, 'id' | 'connectedTo' | 'merged'>) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  selectShape: (id: string | null) => void;
  setActiveShapeType: (type: Shape['type']) => void;
  setCanvasScale: (scale: number) => void;
  setCanvasOffset: (offset: { x: number; y: number }) => void;
  setShapeMergeEnabled: (enabled: boolean) => void;
  mergeShapes: (shapeIds: string[]) => void;
  clearCanvas: () => void;
  checkAndMergeConnectedShapes: () => void;
}

export const useShapeStore = create<ShapeStore>((set, get) => ({
  shapes: [],
  selectedShapeId: null,
  activeShapeType: 'rectangle',
  canvasScale: 1,
  canvasOffset: { x: 0, y: 0 },
  shapeMergeEnabled: false,

  addShape: (shapeData) => {
    const newShape: Shape = {
      ...shapeData,
      id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      connectedTo: [],
      merged: false,
    };

    set((state) => ({
      shapes: [...state.shapes, newShape],
      selectedShapeId: newShape.id,
    }));
    get().checkAndMergeConnectedShapes();
  },

  updateShape: (id, updates) => {
    set((state) => ({
      shapes: state.shapes.map((shape) =>
        shape.id === id ? { ...shape, ...updates } : shape
      ),
    }));
    get().checkAndMergeConnectedShapes();
  },

  deleteShape: (id) => {
    set((state) => ({
      shapes: state.shapes.filter((shape) => shape.id !== id),
      selectedShapeId: state.selectedShapeId === id ? null : state.selectedShapeId,
    }));
  },

  selectShape: (id) => {
    set({ selectedShapeId: id });
  },

  setActiveShapeType: (type) => {
    set({ activeShapeType: type });
  },


  setCanvasScale: (scale) => {
    set({ canvasScale: Math.max(0.1, Math.min(5, scale)) });
  },

  setCanvasOffset: (offset) => {
    set({ canvasOffset: offset });
  },

  setShapeMergeEnabled: (enabled) => {
    set({ shapeMergeEnabled: enabled });
  },

  mergeShapes: (shapeIds) => {
    set((state) => {
      const shapesToMerge = state.shapes.filter(shape => shapeIds.includes(shape.id));
      const otherShapes = state.shapes.filter(shape => !shapeIds.includes(shape.id));
      
      if (shapesToMerge.length < 2) return state;
      
      // Mark shapes as connected
      const mergedShapes = shapesToMerge.map(shape => ({
        ...shape,
        connectedTo: shapeIds.filter(id => id !== shape.id),
        merged: true
      }));
      
      return {
        shapes: [...otherShapes, ...mergedShapes]
      };
    });
    get().checkAndMergeConnectedShapes();
  },

  clearCanvas: () => {
    set({
      shapes: [],
      selectedShapeId: null,
    });
  },

  checkAndMergeConnectedShapes: () => {
    set((state) => {
      const TOLERANCE = 0.3; // 0.3 meter tolerance for connection detection
      
      // Helper function to check if two points are close
      const arePointsClose = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
        const distance = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        return distance <= TOLERANCE;
      };

      // Helper function to get shape endpoints/boundaries
      const getShapePoints = (shape: Shape) => {
        if (shape.type === 'line') {
          return [shape.startPoint!, shape.endPoint!];
        } else if (shape.type === 'rectangle' || shape.type === 'square') {
          const { x, y } = shape.position;
          const width = shape.dimensions.width || 0;
          const length = shape.dimensions.length || shape.dimensions.width || 0;
          return [
            { x, y },
            { x: x + width, y },
            { x: x + width, y: y + length },
            { x, y: y + length }
          ];
        } else if (shape.type === 'circle') {
          const { x, y } = shape.position;
          const radius = shape.dimensions.radius || 0;
          return [{ x: x + radius, y: y + radius }]; // Center point for simplicity
        }
        return [];
      };

      // Enhanced function to find enclosed shapes (polygons formed by lines)
      const findEnclosedShapes = (shapes: Shape[]) => {
        const lineShapes = shapes.filter(s => s.type === 'line');
        const enclosedGroups: string[][] = [];
        const usedLines = new Set<string>();
        
        // For each line, try to find a closed path
        lineShapes.forEach(startLine => {
          if (usedLines.has(startLine.id)) return;
          
          const path = [startLine.id];
          let currentPoint = startLine.endPoint!;
          let found = true;
          
          while (found && path.length < 10) { // Max 10 lines to prevent infinite loops
            found = false;
            
            for (const nextLine of lineShapes) {
              if (path.includes(nextLine.id)) continue;
              
              // Check if this line connects to our current point
              if (arePointsClose(currentPoint, nextLine.startPoint!)) {
                path.push(nextLine.id);
                currentPoint = nextLine.endPoint!;
                found = true;
                break;
              } else if (arePointsClose(currentPoint, nextLine.endPoint!)) {
                path.push(nextLine.id);
                currentPoint = nextLine.startPoint!;
                found = true;
                break;
              }
            }
          }
          
          // Check if we've formed a closed loop (connected back to start)
          if (path.length >= 3 && arePointsClose(currentPoint, startLine.startPoint!)) {
            enclosedGroups.push(path);
            path.forEach(id => usedLines.add(id));
          }
        });
        
        return enclosedGroups;
      };

      // Find all enclosed shape groups
      const enclosedGroups = findEnclosedShapes(state.shapes);
      
      // Find connected shapes using point proximity
      const updatedShapes = state.shapes.map(shape => {
        const shapePoints = getShapePoints(shape);
        const connectedShapeIds: string[] = [];
        
        state.shapes.forEach(otherShape => {
          if (shape.id === otherShape.id) return;
          
          const otherShapePoints = getShapePoints(otherShape);
          
          // Check if any points are close enough to be considered connected
          const isConnected = shapePoints.some(point1 => 
            otherShapePoints.some(point2 => arePointsClose(point1, point2))
          );
          
          if (isConnected) {
            connectedShapeIds.push(otherShape.id);
          }
        });
        
        // Check if this shape is part of an enclosed group
        const isInEnclosedGroup = enclosedGroups.some(group => group.includes(shape.id));
        
        // Add all shapes in the same enclosed group as connected
        if (isInEnclosedGroup) {
          const myGroup = enclosedGroups.find(group => group.includes(shape.id));
          if (myGroup) {
            myGroup.forEach(id => {
              if (id !== shape.id && !connectedShapeIds.includes(id)) {
                connectedShapeIds.push(id);
              }
            });
          }
        }
        
        return {
          ...shape,
          connectedTo: connectedShapeIds,
          merged: connectedShapeIds.length > 0 || isInEnclosedGroup
        };
      });
      
      return { ...state, shapes: updatedShapes };
    });
  },
}));