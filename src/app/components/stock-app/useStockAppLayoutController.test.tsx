/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { useState } from "react";
import { createDefaultWorkspaceTabs } from "@/lib/app/workspaceTabs";
import {
  DEFAULT_CELL,
  DEFAULT_LAYOUT,
  type ChartLayout,
} from "@/lib/chartConfig";
import {
  cellChartId,
  clearCellLayoutStoreForTests,
  getCellConfig,
} from "@/lib/chart/cellLayoutStore";
import { useStockAppLayoutController } from "./useStockAppLayoutController";

vi.mock("@/app/components/journal/useChartDeepLinkBootstrap", () => ({
  useChartDeepLinkBootstrap: () => {},
}));

function makeTwoByTwoLayout(): ChartLayout {
  return {
    ...DEFAULT_LAYOUT,
    layoutId: "n4-grid-2x2",
    linkSymbol: true,
    cells: [
      { ...DEFAULT_CELL, symbol: "SPY", symbolName: "SPY" },
      { ...DEFAULT_CELL, symbol: "SPY", symbolName: "SPY" },
      { ...DEFAULT_CELL, symbol: "SPY", symbolName: "SPY" },
      { ...DEFAULT_CELL, symbol: "SPY", symbolName: "SPY" },
    ],
  };
}

function LayoutControllerHarness({
  controllerRef,
}: {
  controllerRef: { current: ReturnType<typeof useStockAppLayoutController> | null };
}) {
  const [layout, setLayout] = useState(makeTwoByTwoLayout());
  const [workspaceTabs, setWorkspaceTabs] = useState(createDefaultWorkspaceTabs());
  const hydratedRef = { current: true };

  const controller = useStockAppLayoutController({
    layout,
    setLayout,
    workspaceTabs,
    setWorkspaceTabs,
    activeTab: { title: "Layout" },
    hydrated: true,
    hydratedRef,
    handleSidebarPanelChange: vi.fn(),
  });

  controllerRef.current = controller;
  return null;
}

describe("useStockAppLayoutController linkSymbol store sync", () => {
  beforeEach(() => {
    clearCellLayoutStoreForTests();
  });

  it("eagerly writes linked peer cells when active symbol changes", async () => {
    const controllerRef: {
      current: ReturnType<typeof useStockAppLayoutController> | null;
    } = { current: null };

    render(<LayoutControllerHarness controllerRef={controllerRef} />);

    await waitFor(() => {
      expect(controllerRef.current).not.toBeNull();
    });

    await act(async () => {
      controllerRef.current?.applyCellUpdate(0, {
        ...DEFAULT_CELL,
        symbol: "AAPL",
        symbolName: "Apple Inc.",
        exchange: "NASDAQ",
      });
    });

    expect(getCellConfig(cellChartId(0))?.symbol).toBe("AAPL");
    expect(getCellConfig(cellChartId(1))?.symbol).toBe("AAPL");
    expect(getCellConfig(cellChartId(2))?.symbol).toBe("AAPL");
    expect(getCellConfig(cellChartId(3))?.symbol).toBe("AAPL");
  });

  it("re-broadcasts active symbol to peers when linkSymbol is enabled", async () => {
    const controllerRef: {
      current: ReturnType<typeof useStockAppLayoutController> | null;
    } = { current: null };

    function UnlinkedHarness() {
      const [layout, setLayout] = useState(() => ({
        ...makeTwoByTwoLayout(),
        linkSymbol: false,
        cells: [
          { ...DEFAULT_CELL, symbol: "AAPL", symbolName: "Apple Inc." },
          { ...DEFAULT_CELL, symbol: "SPY", symbolName: "SPY" },
          { ...DEFAULT_CELL, symbol: "SPY", symbolName: "SPY" },
          { ...DEFAULT_CELL, symbol: "SPY", symbolName: "SPY" },
        ],
      }));
      const [workspaceTabs, setWorkspaceTabs] = useState(createDefaultWorkspaceTabs());
      const hydratedRef = { current: true };

      const controller = useStockAppLayoutController({
        layout,
        setLayout,
        workspaceTabs,
        setWorkspaceTabs,
        activeTab: { title: "Layout" },
        hydrated: true,
        hydratedRef,
        handleSidebarPanelChange: vi.fn(),
      });

      controllerRef.current = controller;
      return null;
    }

    render(<UnlinkedHarness />);

    await waitFor(() => {
      expect(controllerRef.current).not.toBeNull();
    });

    await act(async () => {
      controllerRef.current?.handleLayoutSyncChange({ linkSymbol: true });
    });

    expect(getCellConfig(cellChartId(0))?.symbol).toBe("AAPL");
    expect(getCellConfig(cellChartId(1))?.symbol).toBe("AAPL");
    expect(getCellConfig(cellChartId(2))?.symbol).toBe("AAPL");
    expect(getCellConfig(cellChartId(3))?.symbol).toBe("AAPL");
  });
});
