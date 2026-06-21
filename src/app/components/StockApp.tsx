"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Toolbar from "./Toolbar";
import ChartGrid from "./ChartGrid";
import {
  DEFAULT_CELL,
  DEFAULT_LAYOUT,
  cellCountFor,
  type CellConfig,
  type ChartLayout,
  type GridMode,
  type Theme,
} from "@/lib/chartConfig";
import { loadLayout, saveLayout } from "@/lib/layoutStorage";

export default function StockApp() {
  const [layout, setLayout] = useState<ChartLayout>(DEFAULT_LAYOUT);
  const hydratedRef = useRef(false);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    setLayout(loadLayout());
    hydratedRef.current = true;
  }, []);

  // Apply theme class to <html> when it changes.
  useEffect(() => {
    if (!hydratedRef.current) return;
    document.documentElement.className = layout.theme;
  }, [layout.theme]);

  // Debounced save on any layout change.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const t = setTimeout(() => saveLayout(layout), 500);
    return () => clearTimeout(t);
  }, [layout]);

  // Ensure cells array matches grid mode count.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const needed = cellCountFor(layout.gridMode);
    setLayout((prev) => {
      const cells = [...prev.cells];
      while (cells.length < needed) {
        cells.push({ ...DEFAULT_CELL });
      }
      return { ...prev, cells: cells.slice(0, Math.max(needed, cells.length)) };
    });
  }, [layout.gridMode]);

  const handleCellChange = useCallback((index: number, next: CellConfig) => {
    setLayout((prev) => {
      const cells = [...prev.cells];
      cells[index] = next;
      return { ...prev, cells };
    });
  }, []);

  const handleGridModeChange = useCallback((mode: GridMode) => {
    setLayout((prev) => ({ ...prev, gridMode: mode }));
  }, []);

  const handleThemeChange = useCallback((theme: Theme) => {
    setLayout((prev) => ({ ...prev, theme }));
  }, []);

  const handleLinkedChange = useCallback((linked: boolean) => {
    setLayout((prev) => ({ ...prev, linked }));
  }, []);

  const handleReset = useCallback(() => {
    if (!confirm("Reset layout to defaults? This clears saved drawings.")) return;
    setLayout({ ...DEFAULT_LAYOUT });
    saveLayout(DEFAULT_LAYOUT);
  }, []);

  const cells = useMemo(
    () => layout.cells.slice(0, cellCountFor(layout.gridMode)),
    [layout.cells, layout.gridMode],
  );

  return (
    <div className="flex h-screen flex-col">
      <Toolbar
        gridMode={layout.gridMode}
        theme={layout.theme}
        linked={layout.linked}
        onGridModeChange={handleGridModeChange}
        onThemeChange={handleThemeChange}
        onLinkedChange={handleLinkedChange}
        onReset={handleReset}
      />
      <ChartGrid
        gridMode={layout.gridMode}
        linked={layout.linked}
        theme={layout.theme}
        cells={cells}
        onCellChange={handleCellChange}
      />
    </div>
  );
}
