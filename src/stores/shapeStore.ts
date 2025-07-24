import { create } from 'zustand';

export interface Shape {
  id: string;
  type: 'rectangle' | 'square' | 'circle' | 'polygon';
  dimensions: {
    width?: number;
    height?: number;
    radius?: number;
  };
  position: {
    x: number;
    y: number;
  };
  rotation: number;
  points?: number[]; // For polygon shapes
  connectedTo: string[];
  merged: boolean;
}

interface ShapeStore {
  shapes: Shape[];
  selectedShapeId: string | null;
  activeShapeType: 'rectangle' | 'square' | 'circle' | 'polygon';
  isDrawingMode: boolean;
  canvasScale: number;
  canvasOffset: { x: number; y: number };
  shapeMergeEnabled: boolean;
  
  // Actions
  addShape: (shape: Omit<Shape, 'id' | 'connectedTo' | 'merged'>) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  selectShape: (id: string | null) => void;
  setActiveShapeType: (type: Shape['type']) => void;
  setDrawingMode: (enabled: boolean) => void;
  setCanvasScale: (scale: number) => void;
  setCanvasOffset: (offset: { x: number; y: number }) => void;
  setShapeMergeEnabled: (enabled: boolean) => void;
  mergeShapes: (shapeIds: string[]) => void;
  clearCanvas: () => void;
}

export const useShapeStore = create<ShapeStore>((set, get) => ({
  shapes: [],
  selectedShapeId: null,
  activeShapeType: 'rectangle',
  isDrawingMode: false,
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
  },

  updateShape: (id, updates) => {
    set((state) => ({
      shapes: state.shapes.map((shape) =>
        shape.id === id ? { ...shape, ...updates } : shape
      ),
    }));
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

  setDrawingMode: (enabled) => {
    set({ isDrawingMode: enabled });
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
  },

  clearCanvas: () => {
    set({
      shapes: [],
      selectedShapeId: null,
    });
  },
}));