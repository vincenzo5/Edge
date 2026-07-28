import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { createDefaultWorkspaceTabs } from "@/lib/app/workspaceTabs";
import { DEFAULT_SCREENER_STATE } from "@/lib/screener/screenStorage";
import { DEFAULT_WATCHLIST_STATE } from "@/lib/watchlist/storage";
import { createDefaultScreenerSession } from "@/lib/screener/screenerSession";
import { DEFAULT_CELL } from "@/lib/chartConfig";
import {
  cellChartId,
  clearCellLayoutStoreForTests,
  getCellConfig,
} from "@/lib/chart/cellLayoutStore";
import { useCellLayoutConfig } from "@/lib/chart/useCellLayoutConfig";
import { useStockAppBootstrap } from "./useStockAppBootstrap";

const bootstrapMock = vi.hoisted(() => ({
  resolveAppBootstrap: vi.fn(),
}));

vi.mock("@/lib/app/bootstrap/resolveAppBootstrap", () => ({
  resolveAppBootstrap: bootstrapMock.resolveAppBootstrap,
}));

vi.mock("@/lib/persistence/sync/useChartTemplateLibraryRemoteSync", () => ({
  useChartTemplateLibraryRemoteSync: () => {},
}));

vi.mock("@/lib/persistence/sync/useWorkspaceTabsRemoteSync", () => ({
  useWorkspaceTabsRemoteSync: () => ({ flushActiveTabSave: async () => {} }),
}));

function CellSubscriber() {
  useCellLayoutConfig(cellChartId(0), DEFAULT_CELL);
  return null;
}

function BootstrapHarness({
  bootstrapRef,
}: {
  bootstrapRef: { current: ReturnType<typeof useStockAppBootstrap> | null };
}) {
  const bootstrap = useStockAppBootstrap();
  bootstrapRef.current = bootstrap;
  return <CellSubscriber />;
}

describe("useStockAppBootstrap", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearCellLayoutStoreForTests();
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    bootstrapMock.resolveAppBootstrap.mockResolvedValue({
      workspaceTabs: createDefaultWorkspaceTabs(),
      watchlist: DEFAULT_WATCHLIST_STATE,
      screener: DEFAULT_SCREENER_STATE,
      screenerSession: createDefaultScreenerSession(DEFAULT_SCREENER_STATE),
      remoteApplied: false,
      remotePending: false,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("mirrors layout to cell store after commit without render-time ChartCell updates", async () => {
    const bootstrapRef: { current: ReturnType<typeof useStockAppBootstrap> | null } = {
      current: null,
    };

    render(<BootstrapHarness bootstrapRef={bootstrapRef} />);

    await waitFor(() => {
      expect(bootstrapRef.current?.hydrated).toBe(true);
    });

    consoleErrorSpy.mockClear();

    await act(async () => {
      bootstrapRef.current?.setLayout((prev) => ({
        ...prev,
        cells: [{ ...prev.cells[0], symbol: "AAPL" }, ...prev.cells.slice(1)],
      }));
    });

    expect(getCellConfig(cellChartId(0))?.symbol).toBe("AAPL");

    const renderDuringRenderWarnings = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).includes("Cannot update a component"),
    );
    expect(renderDuringRenderWarnings).toHaveLength(0);
  });
});
