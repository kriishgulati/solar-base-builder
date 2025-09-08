import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useShapeStore } from "@/stores/shapeStore";
import type { Shape } from "@/stores/shapeStore";
import { ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";
import { TopViewCanvas } from "@/components/TopViewCanvas";
import { ObstacleToolbar } from "@/components/ObstacleToolbar";

const PIXELS_PER_METER = 50; // 1 meter = 50 pixels for display

export const SimpleCanvas = ({
  setShowObstacleMode,
}: {
  setShowObstacleMode: (v: boolean) => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragShape, setDragShape] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const lastClickRef = useRef<{
    time: number;
    x: number;
    y: number;
    shapeId: string | null;
  }>({ time: 0, x: 0, y: 0, shapeId: null });
  const lastTouchRef = useRef<{
    time: number;
    x: number;
    y: number;
    shapeId: string | null;
  }>({ time: 0, x: 0, y: 0, shapeId: null });
  const [marquee, setMarquee] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);
  const [groupDragState, setGroupDragState] = useState<{
    memberIds: string[];
    startPositions: Record<string, { x: number; y: number }>;
    grabbedStart: { x: number; y: number } | null;
  }>({ memberIds: [], startPositions: {}, grabbedStart: null });
  const [guidelines, setGuidelines] = useState<
    { x1: number; y1: number; x2: number; y2: number; label: string }[]
  >([]);

  //hello test
  //bye test
  const {
    shapes,
    selectedShapeId,
    selectedShapeIds,
    selectShape,
    selectOnlyShape,
    toggleSelectShape,
    clearShapeSelection,
    updateShape,
    deleteShape,
    canvasScale,
    setCanvasScale,
    canvasOffset,
    setCanvasOffset,
    shapeMergeEnabled,
    createGroup,
    ungroup,
    getGroupIdForShape,
    zoomIn,
    zoomOut,
    recenterCanvas,
  } = useShapeStore();

  const drawShapes = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid centered on canvas center
    ctx.strokeStyle = "hsl(var(--border))";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.2;
    const gridSize = PIXELS_PER_METER * canvasScale;
    const centerX =
      canvas.width / 2 + canvasOffset.x * PIXELS_PER_METER * canvasScale;
    const centerY =
      canvas.height / 2 + canvasOffset.y * PIXELS_PER_METER * canvasScale;
    // vertical lines to the right
    for (let x = centerX; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    // vertical lines to the left
    for (let x = centerX - gridSize; x >= 0; x -= gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    // horizontal lines below
    for (let y = centerY; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    // horizontal lines above
    for (let y = centerY - gridSize; y >= 0; y -= gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Draw connection lines (center-to-center)
    shapes.forEach((shape) => {
      shape.connectedTo.forEach((connectedId) => {
        const connectedShape = shapes.find((s) => s.id === connectedId);
        if (!connectedShape) return;

        ctx.strokeStyle = "hsl(142 76% 55%)";
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);

        const startX =
          centerX + shape.position.x * PIXELS_PER_METER * canvasScale;
        const startY =
          centerY + shape.position.y * PIXELS_PER_METER * canvasScale;
        const endX =
          centerX + connectedShape.position.x * PIXELS_PER_METER * canvasScale;
        const endY =
          centerY + connectedShape.position.y * PIXELS_PER_METER * canvasScale;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    });

    // Draw shapes
    shapes.forEach((shape) => {
      const isSelected =
        selectedShapeId === shape.id || selectedShapeIds.includes(shape.id);
      const isMerged = shape.merged;

      // Set fill and stroke styles
      ctx.fillStyle = isMerged
        ? "hsl(142 76% 55% / 0.8)"
        : isSelected
        ? "hsl(35 91% 55%)"
        : "hsl(35 91% 55% / 0.8)";
      ctx.strokeStyle = isMerged
        ? "hsl(142 76% 55%)"
        : isSelected
        ? "hsl(213 100% 60%)"
        : "hsl(35 91% 55%)";
      ctx.lineWidth = isSelected ? 3 : 2;

      // Get shape dimensions
      const length =
        (shape.dimensions.length || 0) * PIXELS_PER_METER * canvasScale;
      const width =
        (shape.dimensions.width || shape.dimensions.length || 0) *
        PIXELS_PER_METER *
        canvasScale;
      const radius =
        (shape.dimensions.radius || 0) * PIXELS_PER_METER * canvasScale;
      const rotation = ((shape.rotation || 0) * Math.PI) / 180;

      // Use center position directly
      let centerX, centerY;
      centerX =
        canvas.width / 2 + shape.position.x * PIXELS_PER_METER * canvasScale;
      centerY =
        canvas.height / 2 + shape.position.y * PIXELS_PER_METER * canvasScale;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);

      if (shape.type === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else if (shape.type === "triangle") {
        // Equilateral triangle centered at (0,0)
        const triLength = length;
        const triHeight = (triLength * Math.sqrt(3)) / 2;
        ctx.beginPath();
        ctx.moveTo(0, -triHeight / 2); // Top
        ctx.lineTo(-triLength / 2, triHeight / 2); // Bottom left
        ctx.lineTo(triLength / 2, triHeight / 2); // Bottom right
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Rectangle centered at (0,0)
        ctx.beginPath();
        ctx.rect(-length / 2, -width / 2, length, width);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    });

    // Draw dynamic ruler guidelines while dragging
    if (isDragging && guidelines.length > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(120, 120, 120, 0.9)";
      ctx.fillStyle = "rgba(40, 40, 40, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      guidelines.forEach((g) => {
        ctx.beginPath();
        ctx.moveTo(g.x1, g.y1);
        ctx.lineTo(g.x2, g.y2);
        ctx.stroke();

        const midX = (g.x1 + g.x2) / 2;
        const midY = (g.y1 + g.y2) / 2;
        const padding = 4;
        const textWidth = ctx.measureText(g.label).width;
        const boxW = textWidth + padding * 2;
        const boxH = 16;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);
        ctx.strokeStyle = "rgba(120,120,120,0.9)";
        ctx.strokeRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);
        ctx.fillStyle = "rgba(40,40,40,0.95)";
        ctx.fillText(g.label, midX, midY);
      });

      ctx.restore();
    }
  };

  const getShapeBBoxMeters = (s: Shape) => {
    if (s.type === "circle") {
      const d = (s.dimensions.radius || 0) * 2;
      return { length: d, width: d };
    }
    if (s.type === "triangle") {
      const l = s.dimensions.length || 0;
      const h = (l * Math.sqrt(3)) / 2;
      return { length: l, width: h };
    }
    if (s.type === "square") {
      const l = s.dimensions.length || 0;
      return { length: l, width: l };
    }
    return { length: s.dimensions.length || 0, width: s.dimensions.width || 0 };
  };

  const computeGuidelinesForShape = (moving: Shape) => {
    const canvas = canvasRef.current;
    if (!canvas)
      return [] as {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        label: string;
      }[];

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const toPixels = (m: number) => m * PIXELS_PER_METER * canvasScale;

    const movingBBox = getShapeBBoxMeters(moving);
    const movingCenterPx = {
      x: centerX + moving.position.x * PIXELS_PER_METER * canvasScale,
      y: centerY + moving.position.y * PIXELS_PER_METER * canvasScale,
    };

    const lines: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      label: string;
    }[] = [];

    // Nearest neighbor guideline (single)
    const others = shapes.filter((s) => s.id !== moving.id);
    if (others.length > 0) {
      type Neighbor = {
        target: (typeof shapes)[number];
        dxEdgeM: number;
        dyEdgeM: number;
      };
      const neighbors: Neighbor[] = others.map((target) => {
        const targetBBox = getShapeBBoxMeters(target);
        const dxCenterM = Math.abs(moving.position.x - target.position.x);
        const dyCenterM = Math.abs(moving.position.y - target.position.y);
        const dxEdgeM = Math.max(
          0,
          dxCenterM - (movingBBox.length / 2 + targetBBox.length / 2)
        );
        const dyEdgeM = Math.max(
          0,
          dyCenterM - (movingBBox.width / 2 + targetBBox.width / 2)
        );
        return { target, dxEdgeM, dyEdgeM };
      });

      const closest = neighbors.reduce((best, curr) => {
        const currMin = Math.min(curr.dxEdgeM, curr.dyEdgeM);
        const bestMin = Math.min(best.dxEdgeM, best.dyEdgeM);
        return currMin < bestMin ? curr : best;
      });

      const t = closest.target;
      const tBBox = getShapeBBoxMeters(t);
      const tCenterPx = {
        x: centerX + t.position.x * PIXELS_PER_METER * canvasScale,
        y: centerY + t.position.y * PIXELS_PER_METER * canvasScale,
      };

      if (closest.dxEdgeM <= closest.dyEdgeM) {
        const horizDir = Math.sign(tCenterPx.x - movingCenterPx.x) || 1;
        const movingEdgePx =
          movingCenterPx.x +
          toPixels(movingBBox.length / 2) * (horizDir > 0 ? 1 : -1);
        const targetEdgePx =
          tCenterPx.x - toPixels(tBBox.length / 2) * (horizDir > 0 ? 1 : -1);
        const yH = movingCenterPx.y;
        if (targetEdgePx !== movingEdgePx) {
          lines.push({
            x1: movingEdgePx,
            y1: yH,
            x2: targetEdgePx,
            y2: yH,
            label: `${closest.dxEdgeM.toFixed(2)} m`,
          });
        }
      } else {
        const vertDir = Math.sign(tCenterPx.y - movingCenterPx.y) || 1;
        const movingEdgePx =
          movingCenterPx.y +
          toPixels(movingBBox.width / 2) * (vertDir > 0 ? 1 : -1);
        const targetEdgePx =
          tCenterPx.y - toPixels(tBBox.width / 2) * (vertDir > 0 ? 1 : -1);
        const xV = movingCenterPx.x;
        if (targetEdgePx !== movingEdgePx) {
          lines.push({
            x1: xV,
            y1: movingEdgePx,
            x2: xV,
            y2: targetEdgePx,
            label: `${closest.dyEdgeM.toFixed(2)} m`,
          });
        }
      }
    }

    // Add two closest walls (one per axis) from base AABB of shapes
    const shapesForWalls = shapes.filter((s) => s.id !== moving.id);
    if (shapesForWalls.length > 0) {
      const getShapeBBox = getShapeBBoxMeters;

      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      shapesForWalls.forEach((s) => {
        const b = getShapeBBox(s);
        minX = Math.min(minX, s.position.x - b.length / 2);
        maxX = Math.max(maxX, s.position.x + b.length / 2);
        minY = Math.min(minY, s.position.y - b.width / 2);
        maxY = Math.max(maxY, s.position.y + b.width / 2);
      });

      const mLeft = moving.position.x - movingBBox.length / 2;
      const mRight = moving.position.x + movingBBox.length / 2;
      const mTop = moving.position.y - movingBBox.width / 2;
      const mBottom = moving.position.y + movingBBox.width / 2;

      const distLeft = mLeft - minX;
      const distRight = maxX - mRight;
      const distTop = mTop - minY;
      const distBottom = maxY - mBottom;

      // Closest X wall
      if (isFinite(minX) && isFinite(maxX)) {
        if (Math.abs(distLeft) <= Math.abs(distRight)) {
          const xWallPx = centerX + toPixels(minX);
          const xEdgePx = centerX + toPixels(mLeft);
          const yLine = movingCenterPx.y;
          if (xWallPx !== xEdgePx) {
            lines.push({
              x1: xEdgePx,
              y1: yLine,
              x2: xWallPx,
              y2: yLine,
              label: `${Math.abs(distLeft).toFixed(2)} m`,
            });
          }
        } else {
          const xWallPx = centerX + toPixels(maxX);
          const xEdgePx = centerX + toPixels(mRight);
          const yLine = movingCenterPx.y;
          if (xWallPx !== xEdgePx) {
            lines.push({
              x1: xEdgePx,
              y1: yLine,
              x2: xWallPx,
              y2: yLine,
              label: `${Math.abs(distRight).toFixed(2)} m`,
            });
          }
        }
      }

      // Closest Y wall
      if (isFinite(minY) && isFinite(maxY)) {
        if (Math.abs(distTop) <= Math.abs(distBottom)) {
          const yWallPx = centerY + toPixels(minY);
          const yEdgePx = centerY + toPixels(mTop);
          const xLine = movingCenterPx.x;
          if (yWallPx !== yEdgePx) {
            lines.push({
              x1: xLine,
              y1: yEdgePx,
              x2: xLine,
              y2: yWallPx,
              label: `${Math.abs(distTop).toFixed(2)} m`,
            });
          }
        } else {
          const yWallPx = centerY + toPixels(maxY);
          const yEdgePx = centerY + toPixels(mBottom);
          const xLine = movingCenterPx.x;
          if (yWallPx !== yEdgePx) {
            lines.push({
              x1: xLine,
              y1: yEdgePx,
              x2: xLine,
              y2: yWallPx,
              label: `${Math.abs(distBottom).toFixed(2)} m`,
            });
          }
        }
      }
    }

    return lines;
  };

  const getShapeAt = (x: number, y: number) => {
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      const length =
        (shape.dimensions.length || 0) * PIXELS_PER_METER * canvasScale;
      const width =
        (shape.dimensions.width || shape.dimensions.length || 0) *
        PIXELS_PER_METER *
        canvasScale;
      const radius =
        (shape.dimensions.radius || 0) * PIXELS_PER_METER * canvasScale;
      const rotation = ((shape.rotation || 0) * Math.PI) / 180;

      let centerX, centerY;
      if (shape.type === "circle") {
        centerX =
          canvasRef.current!.width / 2 +
          shape.position.x * PIXELS_PER_METER * canvasScale;
        centerY =
          canvasRef.current!.height / 2 +
          shape.position.y * PIXELS_PER_METER * canvasScale;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance <= radius) return shape.id;
      } else {
        centerX =
          canvasRef.current!.width / 2 +
          shape.position.x * PIXELS_PER_METER * canvasScale;
        centerY =
          canvasRef.current!.height / 2 +
          shape.position.y * PIXELS_PER_METER * canvasScale;

        // Transform click point into shape's local coordinates
        const dx = x - centerX;
        const dy = y - centerY;
        const localX = dx * Math.cos(-rotation) - dy * Math.sin(-rotation);
        const localY = dx * Math.sin(-rotation) + dy * Math.cos(-rotation);

        if (shape.type === "triangle") {
          // Simple bounding box for triangle (not perfect, but better)
          const triLength = length;
          const triHeight = (triLength * Math.sqrt(3)) / 2;
          if (
            localX >= -triLength / 2 &&
            localX <= triLength / 2 &&
            localY >= -triHeight / 2 &&
            localY <= triHeight / 2
          ) {
            return shape.id;
          }
        } else {
          // Rectangle
          if (
            localX >= -length / 2 &&
            localX <= length / 2 &&
            localY >= -width / 2 &&
            localY <= width / 2
          ) {
            return shape.id;
          }
        }
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Skip if this is a touch device and we're handling touch events
    if (isTouchDevice) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const shapeId = getShapeAt(x, y);

    if (shapeId) {
      // Double-click detection before any drag starts
      const now = performance.now();
      const prev = lastClickRef.current;
      const dt = now - prev.time;
      const dx = x - prev.x;
      const dy = y - prev.y;
      const distSq = dx * dx + dy * dy;
      const withinTime = dt < 500; // Increased to 500ms for better detection
      const withinDist = distSq < 100; // Increased to 10px radius (100px²)
      const sameShape = prev.shapeId === shapeId;

      console.log("Click detection:", {
        dt,
        distSq,
        withinTime,
        withinDist,
        sameShape,
        shapeId,
        prevShapeId: prev.shapeId,
      });

      if (withinTime && withinDist && (sameShape || prev.shapeId !== null)) {
        console.log("Double-click detected - toggling multi-select mode");
        setMultiSelectMode((m) => !m);
        // On toggle, also toggle current shape selection
        toggleSelectShape(shapeId);
        lastClickRef.current = { time: 0, x: 0, y: 0, shapeId: null };
        setIsDragging(false);
        setDragShape(null);
        return;
      }

      if (shapeMergeEnabled && selectedShapeId && selectedShapeId !== shapeId) {
        const { mergeShapes } = useShapeStore.getState();
        mergeShapes([selectedShapeId, shapeId]);
        selectShape(null);
      } else {
        if (e.shiftKey || multiSelectMode) {
          toggleSelectShape(shapeId);
        } else {
          selectOnlyShape(shapeId);
        }
        setIsDragging(true);
        setDragShape(shapeId);

        const shape = shapes.find((s) => s.id === shapeId);
        if (shape) {
          setDragOffset({
            x:
              x -
              (canvas.width / 2 +
                shape.position.x * PIXELS_PER_METER * canvasScale),
            y:
              y -
              (canvas.height / 2 +
                shape.position.y * PIXELS_PER_METER * canvasScale),
          });

          // initialize group drag members
          const groupId = getGroupIdForShape(shapeId);
          let memberIds: string[] = [];
          if (groupId) {
            const grp = useShapeStore
              .getState()
              .groups.find((g) => g.id === groupId);
            memberIds = grp ? grp.memberIds : [];
          } else if (
            selectedShapeIds.length > 1 &&
            selectedShapeIds.includes(shapeId)
          ) {
            memberIds = [...selectedShapeIds];
          } else {
            memberIds = [shapeId];
          }
          const startPositions: Record<string, { x: number; y: number }> = {};
          memberIds.forEach((id) => {
            const s = shapes.find((sh) => sh.id === id);
            if (s) startPositions[id] = { ...s.position };
          });
          setGroupDragState({
            memberIds,
            startPositions,
            grabbedStart: { ...shape.position },
          });
        }
      }
      // record for potential double-click
      lastClickRef.current = { time: performance.now(), x, y, shapeId };
    } else {
      if (!multiSelectMode) clearShapeSelection();
      lastClickRef.current = { time: performance.now(), x, y, shapeId: null };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragShape) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const newX =
      (x - dragOffset.x - canvas.width / 2) / (PIXELS_PER_METER * canvasScale);
    const newY =
      (y - dragOffset.y - canvas.height / 2) / (PIXELS_PER_METER * canvasScale);
    const snap = useShapeStore.getState().snapToGrid;
    if (groupDragState.memberIds.length <= 1) {
      updateShape(dragShape, { position: snap({ x: newX, y: newY }) });
    } else {
      const grabbedStart = groupDragState.grabbedStart;
      if (!grabbedStart) return;
      const dx = newX - grabbedStart.x;
      const dy = newY - grabbedStart.y;
      groupDragState.memberIds.forEach((id) => {
        const start = groupDragState.startPositions[id];
        if (!start) return;
        const next = snap({ x: start.x + dx, y: start.y + dy });
        updateShape(id, { position: next });
      });
    }

    const moving = shapes.find((s) => s.id === dragShape);
    if (moving) {
      setGuidelines(
        computeGuidelinesForShape({
          ...moving,
          position: { x: newX, y: newY },
        } as typeof moving)
      );
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragShape(null);
    setGuidelines([]);
    setGroupDragState({
      memberIds: [],
      startPositions: {},
      grabbedStart: null,
    });
  };

  // Touch event handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    // e.preventDefault(); // Prevent default touch behavior
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);

    const shapeId = getShapeAt(x, y);

    if (shapeId) {
      // Double-tap detection before any drag starts
      const now = performance.now();
      const prev = lastTouchRef.current;
      const dt = now - prev.time;
      const dx = x - prev.x;
      const dy = y - prev.y;
      const distSq = dx * dx + dy * dy;
      const withinTime = dt < 500; // Increased to 500ms for better detection
      const withinDist = distSq < 100; // Increased to 10px radius (100px²)
      const sameShape = prev.shapeId === shapeId;

      console.log("Touch detection:", {
        dt,
        distSq,
        withinTime,
        withinDist,
        sameShape,
        shapeId,
        prevShapeId: prev.shapeId,
      });

      if (withinTime && withinDist && (sameShape || prev.shapeId !== null)) {
        console.log("Double-tap detected - toggling multi-select mode");
        setMultiSelectMode((m) => !m);
        // On toggle, also toggle current shape selection
        toggleSelectShape(shapeId);
        lastTouchRef.current = { time: 0, x: 0, y: 0, shapeId: null };
        setIsDragging(false);
        setDragShape(null);
        return;
      }

      if (shapeMergeEnabled && selectedShapeId && selectedShapeId !== shapeId) {
        const { mergeShapes } = useShapeStore.getState();
        mergeShapes([selectedShapeId, shapeId]);
        selectShape(null);
      } else {
        if (multiSelectMode) {
          toggleSelectShape(shapeId);
        } else {
          selectOnlyShape(shapeId);
        }
        setIsDragging(true);
        setDragShape(shapeId);

        const shape = shapes.find((s) => s.id === shapeId);
        if (shape) {
          setDragOffset({
            x:
              x -
              (canvas.width / 2 +
                shape.position.x * PIXELS_PER_METER * canvasScale),
            y:
              y -
              (canvas.height / 2 +
                shape.position.y * PIXELS_PER_METER * canvasScale),
          });

          // initialize group drag members
          const groupId = getGroupIdForShape(shapeId);
          let memberIds: string[] = [];
          if (groupId) {
            const grp = useShapeStore
              .getState()
              .groups.find((g) => g.id === groupId);
            memberIds = grp ? grp.memberIds : [];
          } else if (
            selectedShapeIds.length > 1 &&
            selectedShapeIds.includes(shapeId)
          ) {
            memberIds = [...selectedShapeIds];
          } else {
            memberIds = [shapeId];
          }
          const startPositions: Record<string, { x: number; y: number }> = {};
          memberIds.forEach((id) => {
            const s = shapes.find((sh) => sh.id === id);
            if (s) startPositions[id] = { ...s.position };
          });
          setGroupDragState({
            memberIds,
            startPositions,
            grabbedStart: { ...shape.position },
          });
        }
      }
      // record for potential double-tap
      lastTouchRef.current = { time: performance.now(), x, y, shapeId };
    } else {
      if (!multiSelectMode) clearShapeSelection();
      lastTouchRef.current = { time: performance.now(), x, y, shapeId: null };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    //e.preventDefault(); // Prevent default touch behavior
    if (!isDragging || !dragShape) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);

    const newX =
      (x - dragOffset.x - canvas.width / 2) / (PIXELS_PER_METER * canvasScale);
    const newY =
      (y - dragOffset.y - canvas.height / 2) / (PIXELS_PER_METER * canvasScale);
    const snap = useShapeStore.getState().snapToGrid;
    if (groupDragState.memberIds.length <= 1) {
      updateShape(dragShape, { position: snap({ x: newX, y: newY }) });
    } else {
      const grabbedStart = groupDragState.grabbedStart;
      if (!grabbedStart) return;
      const dx = newX - grabbedStart.x;
      const dy = newY - grabbedStart.y;
      groupDragState.memberIds.forEach((id) => {
        const start = groupDragState.startPositions[id];
        if (!start) return;
        const next = snap({ x: start.x + dx, y: start.y + dy });
        updateShape(id, { position: next });
      });
    }

    const moving = shapes.find((s) => s.id === dragShape);
    if (moving) {
      setGuidelines(
        computeGuidelinesForShape({
          ...moving,
          position: { x: newX, y: newY },
        } as typeof moving)
      );
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    //e.preventDefault(); // Prevent default touch behavior
    setIsDragging(false);
    setDragShape(null);
    setGuidelines([]);
    setGroupDragState({
      memberIds: [],
      startPositions: {},
      grabbedStart: null,
    });
  };

  useEffect(() => {
    drawShapes();
  }, [
    shapes,
    selectedShapeId,
    canvasScale,
    canvasOffset,
    isDragging,
    guidelines,
  ]);

  // Keyboard: Escape exits multi-select mode and clears selection
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setMultiSelectMode(false);
        clearShapeSelection();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearShapeSelection]);

  // Detect touch device
  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        "ontouchstart" in window || navigator.maxTouchPoints > 0
      );
    };
    checkTouchDevice();
    window.addEventListener("resize", checkTouchDevice);
    return () => window.removeEventListener("resize", checkTouchDevice);
  }, []);

  const handleZoom = (direction: "in" | "out") => {
    if (direction === "in") zoomIn();
    else zoomOut();
  };

  const handleResetView = () => {
    recenterCanvas();
  };

  const selectedShape = shapes.find((s) => s.id === selectedShapeId);

  return (
    <Card className="h-full bg-canvas-bg shadow-panel relative overflow-hidden">
      {/* Canvas Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => handleZoom("in")}>
          <ZoomIn size={16} />
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleZoom("out")}>
          <ZoomOut size={16} />
        </Button>
        <Button variant="outline" size="sm" onClick={handleResetView}>
          <RotateCcw size={16} />
        </Button>
      </div>

      {/* Shape Info Panel */}
      {selectedShape && (
        <div className="absolute top-4 left-4 z-10 bg-card p-3 rounded-lg shadow-tool border">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <div className="font-medium text-foreground">
                {selectedShape.type.charAt(0).toUpperCase() +
                  selectedShape.type.slice(1)}
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedShape.type === "circle"
                  ? `Radius: ${selectedShape.dimensions.radius?.toFixed(1)}m`
                  : selectedShape.type === "triangle" ||
                    selectedShape.type === "square"
                  ? `Length: ${selectedShape.dimensions.length?.toFixed(1)}m`
                  : `${selectedShape.dimensions.length?.toFixed(
                      1
                    )}m × ${selectedShape.dimensions.width?.toFixed(1)}m`}
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteShape(selectedShape.id)}
            >
              <X size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Scale Indicator */}
      <div className="absolute bottom-4 left-4 z-10 bg-card p-2 rounded border">
        <div className="text-xs text-muted-foreground">
          Scale: {(canvasScale * 100).toFixed(0)}%
        </div>
        {multiSelectMode && (
          <div className="mt-1 text-[10px] text-foreground">
            Multi-select ON (Esc to exit)
          </div>
        )}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={1200}
        height={800}
        className="cursor-crosshair w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "none" }} // Prevent default touch behaviors like scrolling
      />

      {/* Add Obstacles Button */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowObstacleMode(true)}
            className="bg-primary hover:bg-primary/90"
            disabled={shapes.length === 0}
          >
            Add Obstacles
          </Button>
        </div>
      </div>
    </Card>
  );
};

export const SiteBaseDefinition = () => {
  const [showObstacleMode, setShowObstacleMode] = useState(false);
  const { baseHeight, shapes } = useShapeStore(); // Add shapes to destructuring

  return (
    <div className="h-screen bg-gradient-subtle">
      {showObstacleMode ? (
        <div className="h-full flex">
          {/* Left Panel - Obstacle Tools */}
          <div className="w-1/5 p-4 border-r bg-background">
            <ObstacleToolbar
              onClose={() => setShowObstacleMode(false)}
              baseHeight={baseHeight}
            />
          </div>
          {/* Right Panel - Canvas */}
          <div className="w-4/5 p-4">
            <TopViewCanvas shapes={shapes} />
          </div>
        </div>
      ) : (
        <SimpleCanvas setShowObstacleMode={setShowObstacleMode} />
      )}
    </div>
  );
};
