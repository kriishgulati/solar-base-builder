import { create } from "zustand";

export interface Shape {
  id: string;
  type: "rectangle" | "square" | "circle" | "triangle" | "solarPanel";
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

export type Facing = "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW";
export type Facing = "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW";
export interface Obstacle {
  id: string;
  type: Shape["type"];
  dimensions: Shape["dimensions"];
  position: Shape["position"];
  rotation: number;
  height: number; // obstacle's own height
  totalHeight: number; // baseHeight + height
  facingAngle: number;
  facing: Facing;
  facing: Facing;
}

interface ShapeStore {
  shapes: Shape[];
  obstacles: Obstacle[];
  selectedShapeId: string | null;
  selectedShapeIds: string[];
  selectedObstacleId: string | null;
  activeShapeType:
    | "rectangle"
    | "square"
    | "circle"
    | "triangle"
    | "solarPanel";
  canvasScale: number;
  canvasOffset: { x: number; y: number };
  // grid & zoom config
  gridSize: number; // world units per grid cell (e.g. 1 = 1m)
  zoomStep: number;
  minScale: number;
  maxScale: number;
  shapeMergeEnabled: boolean;
  obstacleMode: boolean;
  baseHeight: number;
  // Base-level compass orientation
  baseFacingAngle: number; // degrees, 0 at North, clockwise positive
  baseFacing: Facing;
  obstacleMode: boolean;
  baseHeight: number;
  // Base-level compass orientation
  baseFacingAngle: number; // degrees, 0 at North, clockwise positive
  baseFacing: Facing;
  groups: { id: string; memberIds: string[] }[];
  obstacleGroups: { id: string; memberIds: string[] }[];

  // Actions
  addShape: (shape: Omit<Shape, "id" | "connectedTo" | "merged">) => void;
  addObstacle: (obstacle: Omit<Obstacle, "id">) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  updateObstacle: (id: string, updates: Partial<Obstacle>) => void;
  deleteShape: (id: string) => void;
  deleteObstacle: (id: string) => void;
  selectShape: (id: string | null) => void;
  selectOnlyShape: (id: string | null) => void;
  toggleSelectShape: (id: string) => void;
  clearShapeSelection: () => void;
  selectObstacle: (id: string | null) => void;
  setActiveShapeType: (type: Shape["type"]) => void;
  setCanvasScale: (scale: number) => void;
  setCanvasOffset: (offset: { x: number; y: number }) => void;
  setShapeMergeEnabled: (enabled: boolean) => void;
  setObstacleMode: (enabled: boolean) => void;
  setBaseFacing: (angle: number, label: Facing) => void;
  mergeShapes: (shapeIds: string[]) => void;
  setObstacleMode: (enabled: boolean) => void;
  setBaseFacing: (angle: number, label: Facing) => void;
  setShapeMergeEnabled: (enabled: boolean) => void;
  mergeShapes: (shapeIds: string[]) => void;
  createGroup: (shapeIds: string[]) => string | null;
  ungroup: (groupId: string) => void;
  getGroupIdForShape: (shapeId: string) => string | null;
  createObstacleGroup: (obstacleIds: string[]) => string | null;
  ungroupObstacleGroup: (groupId: string) => void;
  getGroupIdForObstacle: (obstacleId: string) => string | null;
  clearCanvas: () => void;
  clearObstacles: () => void;
  copyShape: (id: string) => void;
  copyObstacle: (id: string) => void;
  setBaseHeight: (height: number) => void;
  // zoom & helpers
  zoomIn: () => void;
  zoomOut: () => void;
  recenterCanvas: () => void;
  recenterOnSelectedObstacle: () => void;
  snapToGrid: (pos: { x: number; y: number }) => { x: number; y: number };
}

export const useShapeStore = create<ShapeStore>((set, get) => ({
  shapes: [],
  obstacles: [],
  selectedShapeId: null,
  selectedShapeIds: [],
  selectedObstacleId: null,
  activeShapeType: "rectangle",
  canvasScale: 1,
  canvasOffset: { x: 0, y: 0 },
  shapeMergeEnabled: false,
  obstacleMode: false,
  baseHeight: 3, // Default height
  baseFacingAngle: 0,
  baseFacing: "N",
  // grid & zoom defaults
  gridSize: 1,
  zoomStep: 1.2,
  minScale: 0.1,
  maxScale: 5,
  groups: [],
  obstacleGroups: [],

  addShape: (shapeData) => {
    // snap incoming position to grid so corners align with grid lines
    const pos = get().snapToGrid(shapeData.position);
    const newShape: Shape = {
      ...shapeData,
      position: pos,
      id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      connectedTo: [],
      merged: false,
    };

    set((state) => ({
      shapes: [...state.shapes, newShape],
      selectedShapeId: newShape.id,
      selectedShapeIds: [newShape.id],
    }));
  },

  addObstacle: (obstacleData) => {
    // snap obstacle position to grid
    const pos = get().snapToGrid(obstacleData.position);
    const newObstacle: Obstacle = {
      ...obstacleData,
      position: pos,
      id: `obstacle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      facingAngle: obstacleData.facingAngle ?? 0,
      facing: obstacleData.facing ?? "N",
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
      selectedShapeId:
        state.selectedShapeId === id ? null : state.selectedShapeId,
      selectedShapeIds: state.selectedShapeIds.filter((sid) => sid !== id),
      groups: state.groups
        .map((g) => ({
          ...g,
          memberIds: g.memberIds.filter((mid) => mid !== id),
        }))
        .filter((g) => g.memberIds.length > 1),
    }));
  },

  deleteObstacle: (id) => {
    set((state) => ({
      obstacles: state.obstacles.filter((obstacle) => obstacle.id !== id),
      selectedObstacleId:
        state.selectedObstacleId === id ? null : state.selectedObstacleId,
      obstacleGroups: state.obstacleGroups
        .map((g) => ({
          ...g,
          memberIds: g.memberIds.filter((mid) => mid !== id),
        }))
        .filter((g) => g.memberIds.length > 1),
    }));
  },

  selectShape: (id) => {
    // keep legacy single select, but do not alter multi-select list
    set({ selectedShapeId: id });
  },

  selectOnlyShape: (id) => {
    set({ selectedShapeId: id, selectedShapeIds: id ? [id] : [] });
  },

  toggleSelectShape: (id) => {
    set((state) => {
      const exists = state.selectedShapeIds.includes(id);
      const next = exists
        ? state.selectedShapeIds.filter((sid) => sid !== id)
        : [...state.selectedShapeIds, id];
      return {
        selectedShapeIds: next,
        selectedShapeId: next.length === 1 ? next[0] : state.selectedShapeId,
      };
    });
  },

  clearShapeSelection: () => {
    set({ selectedShapeId: null, selectedShapeIds: [] });
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

  setBaseFacing: (angle, label) => {
    set({ baseFacingAngle: angle, baseFacing: label });
  },

  mergeShapes: (shapeIds) => {
    set((state) => {
      const shapesToMerge = state.shapes.filter((shape) =>
        shapeIds.includes(shape.id)
      );
      const otherShapes = state.shapes.filter(
        (shape) => !shapeIds.includes(shape.id)
      );

      if (shapesToMerge.length < 2) return state;

      // Mark shapes as connected
      const mergedShapes = shapesToMerge.map((shape) => ({
        ...shape,
        connectedTo: shapeIds.filter((id) => id !== shape.id),
        merged: true,
      }));

      return {
        shapes: [...otherShapes, ...mergedShapes],
      };
    });
  },

  createGroup: (shapeIds) => {
    const unique = Array.from(new Set(shapeIds)).filter(Boolean);
    if (unique.length < 2) return null;
    const id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    set((state) => ({
      groups: [...state.groups, { id, memberIds: unique }],
    }));
    return id;
  },

  ungroup: (groupId) => {
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
    }));
  },

  getGroupIdForShape: (shapeId) => {
    const { groups } = get();
    const g = groups.find((grp) => grp.memberIds.includes(shapeId));
    return g ? g.id : null;
  },

  createObstacleGroup: (obstacleIds) => {
    const unique = Array.from(new Set(obstacleIds)).filter(Boolean);
    if (unique.length < 2) return null;
    const id = `ogrp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    set((state) => ({
      obstacleGroups: [...state.obstacleGroups, { id, memberIds: unique }],
    }));
    return id;
  },

  ungroupObstacleGroup: (groupId) => {
    set((state) => ({
      obstacleGroups: state.obstacleGroups.filter((g) => g.id !== groupId),
    }));
  },

  getGroupIdForObstacle: (obstacleId) => {
    const { obstacleGroups } = get();
    const g = obstacleGroups.find((grp) => grp.memberIds.includes(obstacleId));
    return g ? g.id : null;
  },

  clearCanvas: () => {
    set({
      shapes: [],
      selectedShapeId: null,
      selectedShapeIds: [],
      groups: [],
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
    const shape = state.shapes.find((s) => s.id === id);
    if (!shape) return;
    const offset = { x: shape.position.x + 1, y: shape.position.y + 1 };
    const snapped = get().snapToGrid(offset);
    const newShape: Shape = {
      ...shape,
      id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: snapped,
      connectedTo: [],
      merged: false,
    };
    set({ shapes: [...state.shapes, newShape], selectedShapeId: newShape.id });
  },

  copyObstacle: (id: string) => {
    const state = get();
    const obs = state.obstacles.find((o) => o.id === id);
    if (!obs) return;
    const offset = { x: obs.position.x + 1, y: obs.position.y + 1 };
    const snapped = get().snapToGrid(offset);
    const newObs: Obstacle = {
      ...obs,
      id: `obstacle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: snapped,
    };
    set({
      obstacles: [...state.obstacles, newObs],
      selectedObstacleId: newObs.id,
    });
  },

  setBaseHeight: (height: number) => set({ baseHeight: height }),
  // zoom / recenter helpers
  zoomIn: () => {
    const { canvasScale, zoomStep, maxScale } = get();
    const next = Math.min(maxScale, canvasScale * zoomStep);
    set({ canvasScale: next });
  },

  zoomOut: () => {
    const { canvasScale, zoomStep, minScale } = get();
    const next = Math.max(minScale, canvasScale / zoomStep);
    set({ canvasScale: next });
  },

  recenterCanvas: () => {
    set({ canvasOffset: { x: 0, y: 0 } });
  },

  recenterOnSelectedObstacle: () => {
    const state = get();
    const sel = state.selectedObstacleId
      ? state.obstacles.find((o) => o.id === state.selectedObstacleId)
      : null;
    if (!sel) {
      set({ canvasOffset: { x: 0, y: 0 } });
      return;
    }
    // world-space centering: offset so selected obstacle is at origin
    set({ canvasOffset: { x: -sel.position.x, y: -sel.position.y } });
  },

  snapToGrid: (pos) => {
    const { gridSize } = get();
    return {
      x: Math.round(pos.x / gridSize) * gridSize,
      y: Math.round(pos.y / gridSize) * gridSize,
    };
  },
}));
