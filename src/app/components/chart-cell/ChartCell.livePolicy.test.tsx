import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { forwardRef, useImperativeHandle } from "react";
import ChartCell from "./ChartCell";
import { AppTimeZoneProvider } from "../AppTimeZoneProvider";
import { ActiveChartProvider } from "../ActiveChartContext";
import { SidebarProvider } from "../SidebarContext";
import {
  DEFAULT_CELL,
  DEFAULT_TOOLBAR_PREFS,
} from "@/lib/chartConfig";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const edgeChartLive = vi.fn();
let mockViewportModified = false;
let mockDrawings: { id: string }[] = [];

vi.mock("./EdgeChart", () => ({
  default: forwardRef(function MockEdgeChart(
    props: { live?: boolean },
    ref,
  ) {
    edgeChartLive(props.live);
    useImperativeHandle(ref, () => ({
      getTrackedOverlays: () => [],
      subscribeOverlayChange: () => () => {},
      onSelectionChange: () => () => {},
      serializeDrawings: () => mockDrawings,
      setMagnet: vi.fn(),
      setKeepDrawingMode: vi.fn(),
      stopDrawing: vi.fn(),
      startDrawing: vi.fn(),
      lockAllDrawings: vi.fn(),
      setAllDrawingsVisible: vi.fn(),
      zoomIn: vi.fn(),
      getCandles: () => [],
      clearDrawings: vi.fn(),
      removeOverlay: vi.fn(),
      setOverlayVisible: vi.fn(),
      setOverlayLocked: vi.fn(),
      renameOverlay: vi.fn(),
      bringForward: vi.fn(),
      sendBackward: vi.fn(),
      duplicateOverlay: vi.fn(),
      isViewportModified: () => mockViewportModified,
      getVisibleRange: () =>
        mockViewportModified
          ? {
              startIndex: 20,
              endIndex: 120,
              priceMin: 90,
              priceMax: 110,
              priceScaleMode: "manual" as const,
            }
          : null,
      resetChartView: vi.fn(),
      setCrosshairFromSync: vi.fn(),
      restoreDrawings: vi.fn(),
    }));
    return <div data-testid="edge-chart-mock" />;
  }),
  indicatorKey: (ind: { id: string }) => ind.id,
}));

function renderChartCell(
  props: {
    isActive?: boolean;
    live?: boolean;
    mountChartEngine?: boolean;
  },
  onConfigChange = vi.fn(),
) {
  return render(
    <AppTimeZoneProvider>
      <SidebarProvider activePanel={null} onActivePanelChange={vi.fn()}>
        <ActiveChartProvider>
          <ChartCell
            chartId="cell-0"
            config={DEFAULT_CELL}
            theme="dark"
            compact
            isActive={props.isActive ?? true}
            live={props.live}
            mountChartEngine={props.mountChartEngine}
            toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
            onConfigChange={onConfigChange}
            onToolbarPrefsChange={vi.fn()}
          />
        </ActiveChartProvider>
      </SidebarProvider>
    </AppTimeZoneProvider>,
  );
}

describe("ChartCell live policy wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockViewportModified = false;
    mockDrawings = [];
  });

  afterEach(() => {
    cleanup();
  });

  it("defaults live to isActive when live prop is unset", () => {
    renderChartCell({ isActive: true });
    expect(edgeChartLive).toHaveBeenCalledWith(true);
    expect(screen.getByTestId("edge-chart-mock")).toBeInTheDocument();
    cleanup();

    edgeChartLive.mockClear();
    renderChartCell({ isActive: false });
    expect(edgeChartLive).not.toHaveBeenCalled();
    expect(screen.queryByTestId("edge-chart-mock")).not.toBeInTheDocument();
    expect(screen.getByTestId("inactive-chart-surface")).toBeInTheDocument();
  });

  it("honors explicit live override while isActive stays false (journal fork)", () => {
    renderChartCell({ isActive: false, live: true });
    expect(edgeChartLive).toHaveBeenCalledWith(true);
    expect(screen.getByTestId("edge-chart-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("inactive-chart-surface")).not.toBeInTheDocument();
  });

  it("mounts engine for inactive cell when mountChartEngine is true", () => {
    renderChartCell({ isActive: false, live: true, mountChartEngine: true });
    expect(edgeChartLive).toHaveBeenCalledWith(true);
    expect(screen.getByTestId("edge-chart-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("inactive-chart-surface")).not.toBeInTheDocument();
  });

  it("keeps engine mounted when active cell changes with mountChartEngine true", () => {
    const onConfigChange = vi.fn();
    const { rerender } = renderChartCell(
      { isActive: true, live: true, mountChartEngine: true },
      onConfigChange,
    );
    expect(screen.getByTestId("edge-chart-mock")).toBeInTheDocument();

    rerender(
      <AppTimeZoneProvider>
        <SidebarProvider activePanel={null} onActivePanelChange={vi.fn()}>
          <ActiveChartProvider>
            <ChartCell
              chartId="cell-0"
              config={DEFAULT_CELL}
              theme="dark"
              compact
              isActive={false}
              live={true}
              mountChartEngine
              toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
              onConfigChange={onConfigChange}
              onToolbarPrefsChange={vi.fn()}
            />
          </ActiveChartProvider>
        </SidebarProvider>
      </AppTimeZoneProvider>,
    );

    expect(screen.getByTestId("edge-chart-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("inactive-chart-surface")).not.toBeInTheDocument();
    expect(edgeChartLive).toHaveBeenLastCalledWith(true);
  });

  it("unmounts EdgeChart when mountChartEngine becomes false", () => {
    const onConfigChange = vi.fn();
    const { rerender } = renderChartCell(
      { isActive: true, live: true, mountChartEngine: true },
      onConfigChange,
    );
    expect(screen.getByTestId("edge-chart-mock")).toBeInTheDocument();

    rerender(
      <AppTimeZoneProvider>
        <SidebarProvider activePanel={null} onActivePanelChange={vi.fn()}>
          <ActiveChartProvider>
            <ChartCell
              chartId="cell-0"
              config={DEFAULT_CELL}
              theme="dark"
              compact
              isActive={false}
              live={false}
              mountChartEngine={false}
              toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
              onConfigChange={onConfigChange}
              onToolbarPrefsChange={vi.fn()}
            />
          </ActiveChartProvider>
        </SidebarProvider>
      </AppTimeZoneProvider>,
    );

    expect(screen.queryByTestId("edge-chart-mock")).not.toBeInTheDocument();
    expect(screen.getByTestId("inactive-chart-surface")).toBeInTheDocument();
  });

  it("flushes modified viewport into config before unmounting inactive cell", () => {
    mockViewportModified = true;
    const onConfigChange = vi.fn();
    const { rerender } = renderChartCell({ isActive: true }, onConfigChange);

    rerender(
      <AppTimeZoneProvider>
        <SidebarProvider activePanel={null} onActivePanelChange={vi.fn()}>
          <ActiveChartProvider>
            <ChartCell
              chartId="cell-0"
              config={DEFAULT_CELL}
              theme="dark"
              compact
              isActive={false}
              mountChartEngine={false}
              toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
              onConfigChange={onConfigChange}
              onToolbarPrefsChange={vi.fn()}
            />
          </ActiveChartProvider>
        </SidebarProvider>
      </AppTimeZoneProvider>,
    );

    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        viewport: {
          startIndex: 20,
          endIndex: 120,
          priceMin: 90,
          priceMax: 110,
          priceScaleMode: "manual",
        },
      }),
    );
  });
});
