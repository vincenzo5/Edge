"use client";

import {
  CHART_TYPES,
  GRID_MODES,
  INTERVALS,
  RANGES,
  cellCountFor,
  type CellConfig,
  type GridMode,
  type Theme,
} from "@/lib/chartConfig";

type Props = {
  gridMode: GridMode;
  theme: Theme;
  linked: boolean;
  activeCellIndex: number;
  onGridModeChange: (mode: GridMode) => void;
  onThemeChange: (theme: Theme) => void;
  onLinkedChange: (linked: boolean) => void;
  onReset: () => void;
};

export default function Toolbar({
  gridMode,
  theme,
  linked,
  activeCellIndex,
  onGridModeChange,
  onThemeChange,
  onLinkedChange,
  onReset,
}: Props) {
  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-800">
      <h1 className="mr-2 text-lg font-bold">Stock Charts</h1>

      <div className="flex items-center gap-1">
        <span className="text-xs opacity-60">Layout</span>
        <select
          value={gridMode}
          onChange={(e) => onGridModeChange(e.target.value as GridMode)}
          className="rounded border border-gray-300 bg-transparent px-1 py-1 text-xs dark:border-gray-700"
        >
          {GRID_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={linked}
          onChange={(e) => onLinkedChange(e.target.checked)}
        />
        Link symbols
      </label>

      {cellCountFor(gridMode) > 1 && (
        <span className="text-xs opacity-60">
          Cell {activeCellIndex + 1}/{cellCountFor(gridMode)}
        </span>
      )}

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
        className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        {theme === "dark" ? "Light" : "Dark"}
      </button>

      <button
        type="button"
        onClick={onReset}
        className="rounded border border-gray-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-900/20"
      >
        Reset
      </button>
    </header>
  );
}
