import { create } from 'zustand';

export interface Shape {
  id: string;
  type: 'rectangle' | 'square' | 'circle' | 'triangle' | 'solarPanel';
  dimensions: {
    length?: number;
    width?: number;
    radius?: number;
  };
  position: {
    x: number;
    y: number;
  };
  rotation: number;
  connectedTo: string[];
  merged: boolean;
}

export interface Obstacle {
  id: string;
  type: Shape['type'];
  dimensions: Shape['dimensions'];
  position: Shape['position'];
  rotation: number;
  height: number;         // obstacle's own height
  totalHeight: number;    // baseHeight + height
}

interface ShapeStore {
  shapes: Shape[];
  obstacles: Obstacle[];
  selectedShapeId: string | null;
  selectedObstacleId: string | null;
  activeShapeType: 'rectangle' | 'square' | 'circle' | 'triangle' | 'solarPanel';
  canvasScale: number;
  canvasOffset: { x: number; y: number };
  shapeMergeEnabled: boolean;
  obstacleMode: boolean;
  baseHeight: number;
  
  // Actions
  addShape: (shape: Omit<Shape, 'id' | 'connectedTo' | 'merged'>) => void;
  addObstacle: (obstacle: Omit<Obstacle, 'id'>) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  updateObstacle: (id: string, updates: Partial<Obstacle>) => void;
  deleteShape: (id: string) => void;
  deleteObstacle: (id: string) => void;
  selectShape: (id: string | null) => void;
  selectObstacle: (id: string | null) => void;
  setActiveShapeType: (type: Shape['type']) => void;
  setCanvasScale: (scale: number) => void;
  setCanvasOffset: (offset: { x: number; y: number }) => void;
  setShapeMergeEnabled: (enabled: boolean) => void;
  setObstacleMode: (enabled: boolean) => void;
  mergeShapes: (shapeIds: string[]) => void;
  clearCanvas: () => void;
  clearObstacles: () => void;
  copyShape: (id: string) => void;
  copyObstacle: (id: string) => void;
  setBaseHeight: (height: number) => void;
}

export const useShapeStore = create<ShapeStore>((set, get) => ({
  shapes: [],
  obstacles: [],
  selectedShapeId: null,
  selectedObstacleId: null,
  activeShapeType: 'rectangle',
  canvasScale: 1,
  canvasOffset: { x: 0, y: 0 },
  shapeMergeEnabled: false,
  obstacleMode: false,
  baseHeight: 3, // Default height

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

  addObstacle: (obstacleData) => {
    const newObstacle: Obstacle = {
      ...obstacleData,
      id: `obstacle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    set((state) => ({
      obstacles: [...state.obstacles, newObstacle],
      selectedObstacleId: newObstacle.id,
    }));
  },

  updateShape: (id, updates) => {
    set((state) => ({
      shapes: state.shapes.map((shape) =>
        shape.id === id ? { ...shape, ...updates } : shape
      ),
    }));
  },

  updateObstacle: (id, updates) => {
    set((state) => ({
      obstacles: state.obstacles.map((obstacle) =>
        obstacle.id === id ? { ...obstacle, ...updates } : obstacle
      ),
    }));
  },

  deleteShape: (id) => {
    set((state) => ({
      shapes: state.shapes.filter((shape) => shape.id !== id),
      selectedShapeId: state.selectedShapeId === id ? null : state.selectedShapeId,
    }));
  },

  deleteObstacle: (id) => {
    set((state) => ({
      obstacles: state.obstacles.filter((obstacle) => obstacle.id !== id),
      selectedObstacleId: state.selectedObstacleId === id ? null : state.selectedObstacleId,
    }));
  },

  selectShape: (id) => {
    set({ selectedShapeId: id });
  },

  selectObstacle: (id) => {
    set({ selectedObstacleId: id });
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

  setObstacleMode: (enabled) => {
    set({ obstacleMode: enabled });
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

  clearObstacles: () => {
    set({
      obstacles: [],
      selectedObstacleId: null,
    });
  },

  // Copy actions: duplicate shape or obstacle with new id and slight offset
  copyShape: (id: string) => {
    const state = get();
    const shape = state.shapes.find(s => s.id === id);
    if (!shape) return;
    const newShape: Shape = {
      ...shape,
      id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: { x: shape.position.x + 1, y: shape.position.y + 1 }, // offset to avoid exact overlap
      connectedTo: [],
      merged: false,
    };
    set({ shapes: [...state.shapes, newShape], selectedShapeId: newShape.id });
  },

  copyObstacle: (id: string) => {
    const state = get();
    const obs = state.obstacles.find(o => o.id === id);
    if (!obs) return;
    const newObs: Obstacle = {
      ...obs,
      id: `obstacle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: { x: obs.position.x + 1, y: obs.position.y + 1 },
    };
    set({ obstacles: [...state.obstacles, newObs], selectedObstacleId: newObs.id });
  },

  setBaseHeight: (height: number) => set({ baseHeight: height }),
}));