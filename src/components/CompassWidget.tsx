import React, { useMemo, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import "./CompassWidget.css";

type Facing = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export interface CompassWidgetProps {
  valueAngle?: number; // 0=N clockwise
  valueLabel?: Facing;
  onChange: (next: { angle: number; label: Facing }) => void;
  className?: string;
}

const ticks: { angle: number; label: Facing }[] = [
  { angle: 0, label: "N" },
  { angle: 45, label: "NE" },
  { angle: 90, label: "E" },
  { angle: 135, label: "SE" },
  { angle: 180, label: "S" },
  { angle: 225, label: "SW" },
  { angle: 270, label: "W" },
  { angle: 315, label: "NW" },
];

function snapAngle(angleDeg: number): { angle: number; label: Facing } {
  const wrapped = ((angleDeg % 360) + 360) % 360;
  let best = ticks[0];
  let minDiff = 9999;
  for (const t of ticks) {
    const diff = Math.min(
      Math.abs(wrapped - t.angle),
      360 - Math.abs(wrapped - t.angle)
    );
    if (diff < minDiff) {
      minDiff = diff;
      best = t;
    }
  }
  return { angle: best.angle, label: best.label };
}

export const CompassWidget: React.FC<CompassWidgetProps> = ({
  valueAngle = 0,
  valueLabel,
  onChange,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const current = useMemo(() => snapAngle(valueAngle), [valueAngle]);

  // Get CSS class for rotation
  const getRotationClass = (angle: number) => `compass-rotate-${angle}`;
  const getTickClass = (angle: number) => `compass-tick-${angle}`;

  // Native event handlers for better control
  const handlePointerDown = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
    handlePointerMove(e);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    e.preventDefault();
    e.stopPropagation();

    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    // screen y increases downward. Derive dial rotation so 0 deg at top, clockwise positive
    const rawRad = Math.atan2(dx, -dy); // swap to make 0 at top
    const rawDeg = (rawRad * 180) / Math.PI;
    const snapped = snapAngle(rawDeg);
    onChange({ angle: snapped.angle, label: snapped.label });
  };

  const handlePointerUp = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Convert wheel delta to angle change
    const deltaAngle = e.deltaY > 0 ? -15 : 15; // 15 degree steps
    const newAngle = (((valueAngle + deltaAngle) % 360) + 360) % 360;
    const snapped = snapAngle(newAngle);
    onChange({ angle: snapped.angle, label: snapped.label });
  };

  // Set up native event listeners
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    element.addEventListener("pointerdown", handlePointerDown, {
      passive: false,
    });
    element.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    element.addEventListener("pointerup", handlePointerUp, { passive: false });
    element.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      element.removeEventListener("pointerdown", handlePointerDown);
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerup", handlePointerUp);
      element.removeEventListener("wheel", handleWheel);
    };
  }, [dragging, valueAngle, onChange]);

  return (
    <div
      ref={containerRef}
      className={cn("select-none compass-container", className)}
      onWheel={(e) => e.preventDefault()}
    >
      <div className="relative w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] lg:w-[140px] lg:h-[140px] rounded-full compass-dial">
        {/* Main compass background with radial gradient */}
        <div className="absolute inset-0 rounded-full compass-background" />

        {/* Outer ring */}
        <div className="absolute inset-2 rounded-full compass-outer-ring" />

        {/* Degree tick marks - simplified to avoid inline styles */}
        <div className="absolute inset-0 rounded-full compass-ticks">
          {/* Only render major ticks to avoid performance issues */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(
            (angle) => (
              <div
                key={angle}
                className={`absolute compass-degree-tick compass-degree-${angle}`}
              />
            )
          )}
        </div>

        {/* Major tick marks for every 30 degrees */}
        <div className="absolute inset-0 rounded-full">
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(
            (angle) => (
              <div
                key={angle}
                className={`absolute compass-major-tick compass-major-${angle}`}
              />
            )
          )}
        </div>

        {/* Rotating dial with cardinal directions */}
        <div
          className={cn(
            "absolute inset-0 compass-rotating-dial",
            getRotationClass(current.angle)
          )}
        >
          {ticks.map((t) => (
            <div
              key={t.label}
              className={cn(
                "absolute left-1/2 top-1/2 text-white compass-tick-label",
                getTickClass(t.angle),
                ["N", "E", "S", "W"].includes(t.label)
                  ? "text-lg font-semibold tracking-wide"
                  : "text-sm font-medium tracking-wide"
              )}
            >
              {t.label}
            </div>
          ))}
        </div>

        {/* Compass needle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-1 h-16">
            {/* Red needle (North) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[2px] border-r-[2px] border-b-[16px] border-l-transparent border-r-transparent border-b-red-500 compass-needle-red" />
            {/* White needle (South) */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[2px] border-r-[2px] border-t-[16px] border-l-transparent border-r-transparent border-t-white compass-needle-white" />
          </div>
        </div>

        {/* Center degree display */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <span className="text-white font-semibold tracking-wide text-shadow compass-degree-text">
            {Math.round(valueAngle)}°
          </span>
        </div>
      </div>
    </div>
  );
};

export default CompassWidget;
