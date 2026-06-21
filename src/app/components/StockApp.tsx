"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Toolbar from "./Toolbar";
import ChartGrid from "./ChartGrid";
import {
  DEFAULT_CELL,
  DEFAULT_LAYOUT,
  DEFAULT_TOOLBAR_PREFS,
  cellCountFor,
  pickLinkFields,
  type CellConfig,
  type ChartLayout,
  type GridMode,
  type Theme,
  type ToolbarPrefs,
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

  // Ensure cells array matches grid mode count; clamp active cell index.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const needed = cellCountFor(layout.gridMode);
    setLayout((prev) => {
      const cells = [...prev.cells];
      while (cells.length < needed) {
        cells.push({ ...DEFAULT_CELL });
      }
      const trimmed = cells.slice(0, Math.max(needed, cells.length));
      const maxIndex = Math.max(0, needed - 1);
      const activeCellIndex = Math.min(prev.activeCellIndex ?? 0, maxIndex);
      if (
        trimmed.length === prev.cells.length &&
        activeCellIndex === prev.activeCellIndex
      ) {
        return prev;
      }
      return {
        ...prev,
        cells: trimmed,
        activeCellIndex,
      };
    });
  }, [layout.gridMode]);

  const applyCellUpdate = useCallback((index: number, next: CellConfig) => {
    setLayout((prev) => {
      const count = cellCountFor(prev.gridMode);
      const cells = [...prev.cells];
      cells[index] = next;
      if (prev.linked) {
        const linkFields = pickLinkFields(next);
        for (let i = 0; i < count; i++) {
          if (i !== index) {
            cells[i] = { ...cells[i], ...linkFields };
          }
        }
      }
      return { ...prev, cells };
    });
  }, []);

  const handleActiveCellChange = useCallback((index: number) => {
    setLayout((prev) => {
      const maxIndex = cellCountFor(prev.gridMode) - 1;
      const activeCellIndex = Math.max(0, Math.min(index, maxIndex));
      if (activeCellIndex === prev.activeCellIndex) return prev;
      return { ...prev, activeCellIndex };
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

  const handleToolbarPrefsChange = useCallback((next: ToolbarPrefs) => {
    setLayout((prev) => ({ ...prev, toolbarPrefs: next }));
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
    <div className="flex h-screen min-h-0 flex-col overflow-hidden">
      <Toolbar
        gridMode={layout.gridMode}
        theme={layout.theme}
        linked={layout.linked}
        activeCellIndex={layout.activeCellIndex}
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
        activeCellIndex={layout.activeCellIndex}
        toolbarPrefs={layout.toolbarPrefs ?? DEFAULT_TOOLBAR_PREFS}
        onCellChange={applyCellUpdate}
        onActiveCellChange={handleActiveCellChange}
        onToolbarPrefsChange={handleToolbarPrefsChange}
      />
    </div>
  );
}
