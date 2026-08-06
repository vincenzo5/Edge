/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useState, type RefObject } from "react";
import { useDrawingLayoutSync } from "./useDrawingLayoutSync";
import type { ChartHandle } from "./EdgeChart";
import type { CellConfig } from "@/lib/chartConfig";
import type { SerializedDrawing } from "@edge/chart-core/contracts";

vi.mock("@/lib/alerts/drawingAlertSync", () => ({
  syncAlertsWithDrawingChanges: vi.fn(async () => {}),
}));

vi.mock("@/lib/trading/playbook/playbookStopSync", () => ({
  syncPlaybookStopOnDrawingChange: vi.fn(async () => {}),
}));

const drawing: SerializedDrawing = {
  id: "d1",
  name: "trend_line",
  label: "Trend Line",
  points: [
    { timestamp: 1000, value: 100 },
    { timestamp: 3000, value: 115 },
  ],
  visible: true,
  locked: false,
  zLevel: 1,
  paneId: "price",
};

function baseConfig(drawings: SerializedDrawing[] = [drawing]): CellConfig {
  return {
    symbol: "AAPL",
    range: "1y",
    interval: "1d",
    chartType: "candle_solid",
    indicators: [],
    drawings,
  };
}

function makeChart(initial: SerializedDrawing[] = [drawing]) {
  let drawings = initial.map((d) => ({ ...d, points: d.points.map((p) => ({ ...p })) }));
  let revision = 1;
  const overlayCbs = new Set<() => void>();
  const chart = {
    serializeDrawings: () => drawings,
    getDrawingRevision: () => revision,
    getTrackedOverlays: () =>
      drawings.map((d) => ({
        id: d.id!,
        name: d.name,
        label: d.label,
        visible: d.visible,
        locked: d.locked,
        zLevel: d.zLevel,
      })),
    restoreDrawings: vi.fn((next: SerializedDrawing[]) => {
      drawings = next.map((d) => ({ ...d, points: d.points.map((p) => ({ ...p })) }));
      revision += 1;
      overlayCbs.forEach((cb) => cb());
    }),
    subscribeOverlayChange: (cb: () => void) => {
      overlayCbs.add(cb);
      return () => overlayCbs.delete(cb);
    },
    onSelectionChange: () => () => {},
    /** Test helper: mutate store + notify like a real drawing edit. */
    emitLocalEdit(next: SerializedDrawing[]) {
      drawings = next.map((d) => ({ ...d, points: d.points.map((p) => ({ ...p })) }));
      revision += 1;
      overlayCbs.forEach((cb) => cb());
    },
  };
  return chart;
}

describe("useDrawingLayoutSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("skips restoreDrawings after local persist echo so undo history can survive", () => {
    const chart = makeChart();
    const chartRef = { current: chart } as RefObject<ChartHandle | null>;
    let latestConfig = baseConfig();
    let latestRevision = 1;
    const onConfigChange = vi.fn((next: CellConfig) => {
      latestConfig = next;
      latestRevision += 1;
    });

    const { rerender, result } = renderHook(
      ({ config, configRevision }: { config: CellConfig; configRevision: number }) => {
        const [, setSelected] = useState<string | null>(null);
        const [, setHistoryRevision] = useState(0);
        return useDrawingLayoutSync({
          chartRef,
          config,
          configRevision,
          onConfigChange,
          chartId: "cell-0",
          isActive: true,
          sync: null,
          setSelectedOverlayId: setSelected,
          setHistoryRevision,
          chartEngineGeneration: 0,
        });
      },
      {
        initialProps: { config: latestConfig, configRevision: latestRevision },
      },
    );

    const restoresAfterMount = (chart.restoreDrawings as ReturnType<typeof vi.fn>).mock.calls
      .length;

    act(() => {
      chart.emitLocalEdit([
        {
          ...drawing,
          styles: { lineColor: "#00FF88" },
        },
      ]);
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onConfigChange).toHaveBeenCalled();
    expect(result.current.lastAppliedDrawingRevisionRef.current).toBe(
      chart.getDrawingRevision(),
    );

    // Parent echoes persisted drawings + bumped layout revision (same as ChartCell).
    rerender({ config: latestConfig, configRevision: latestRevision });

    expect((chart.restoreDrawings as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      restoresAfterMount,
    );
  });
});
