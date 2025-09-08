import React from 'react';

interface SunControlsProps {
  latitude: number;
  longitude: number;
  date: Date;
  timeMinutes: number; // minutes since midnight
  manualSunEnabled: boolean;
  onLatitudeChange: (lat: number) => void;
  onLongitudeChange: (lng: number) => void;
  onDateChange: (date: Date) => void;
  onTimeMinutesChange: (minutes: number) => void;
  onManualToggle: (enabled: boolean) => void;
  playing: boolean;
  onTogglePlay: () => void;
}

export const SunControls: React.FC<SunControlsProps> = ({
  latitude,
  longitude,
  date,
  timeMinutes,
  manualSunEnabled,
  onLatitudeChange,
  onLongitudeChange,
  onDateChange,
  onTimeMinutesChange,
  onManualToggle,
  playing,
  onTogglePlay,
}) => {
  return (
    <div className="pointer-events-auto absolute left-4 top-4 z-10 w-[320px] rounded-md bg-white/85 p-3 shadow-md backdrop-blur">
      <div className="mb-2 text-sm font-medium text-slate-700">Sun, Date & Location</div>
      <div className="flex flex-col gap-2 text-xs text-slate-700">
        <div className="flex items-center justify-between gap-2">
          <span>Control</span>
          <div className="flex items-center gap-2">
            <button
              className={`rounded px-2 py-1 ${manualSunEnabled ? 'bg-slate-200' : 'bg-blue-600 text-white'}`}
              onClick={() => onManualToggle(false)}
            >Follow SunCalc</button>
            <button
              className={`rounded px-2 py-1 ${manualSunEnabled ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}
              onClick={() => onManualToggle(true)}
            >Drag Sun</button>
          </div>
        </div>
        <label className="flex items-center justify-between gap-2">
          <span>Latitude</span>
          <input
            className="w-40 rounded border border-slate-300 px-2 py-1 text-right"
            type="number"
            step="0.0001"
            value={latitude}
            onChange={(e) => onLatitudeChange(parseFloat(e.target.value))}
          />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span>Longitude</span>
          <input
            className="w-40 rounded border border-slate-300 px-2 py-1 text-right"
            type="number"
            step="0.0001"
            value={longitude}
            onChange={(e) => onLongitudeChange(parseFloat(e.target.value))}
          />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span>Date</span>
          <input
            className="w-40 rounded border border-slate-300 px-2 py-1"
            type="date"
            value={(() => {
              const d = new Date(date);
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              return `${y}-${m}-${dd}`;
            })()}
            onChange={(e) => {
              const parts = e.target.value.split('-');
              if (parts.length === 3) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const d = parseInt(parts[2], 10);
                const nd = new Date(date);
                nd.setFullYear(y, m, d);
                onDateChange(nd);
              }
            }}
          />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span>Time</span>
          <input
            className="w-40"
            type="range"
            min={0}
            max={24 * 60 - 1}
            value={timeMinutes}
            onChange={(e) => onTimeMinutesChange(parseInt(e.target.value, 10))}
          />
        </label>
        <div className="flex items-center justify-between gap-2">
          <div className="tabular-nums">
            {String(Math.floor(timeMinutes / 60)).padStart(2, '0')}
            :
            {String(timeMinutes % 60).padStart(2, '0')}
          </div>
          <button
            className={`rounded px-2 py-1 ${playing ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}
            onClick={onTogglePlay}
          >{playing ? 'Pause' : 'Play'}</button>
        </div>
      </div>
    </div>
  );
};

export default SunControls;


