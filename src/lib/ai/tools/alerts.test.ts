import { describe, expect, it, vi } from "vitest";
import type { AlertsPort } from "../alertsPort";
import type { ToolContext } from "../context";
import type { AlertDefinitionResponse } from "@/lib/persistence/schemas/alerts";
import type { ChartLayout } from "@/lib/chartConfig";
import {
  createAlertTool,
  createDrawingAlertTool,
  createWatchlistAlertTool,
  deleteAlertTool,
  dismissAlertTool,
  getAlertTool,
  listAlertEventsTool,
  listAlertsTool,
  openAlertOnChartTool,
  previewAlertTool,
  suggestAlertsForChartTool,
  updateAlertTool,
} from "./alerts";

const alertId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const sampleAlert: AlertDefinitionResponse = {
  id: alertId,
  symbol: "AAPL",
  operator: "cross_above",
  price: 200,
  message: "Breakout",
  recurrence: "once",
  status: "active",
  cooldownMs: 60_000,
  expiresAt: null,
  lastPrice: 198,
  lastFiredAt: null,
  drawingId: null,
  drawingKind: null,
  priceHigh: null,
  tlT0: null,
  tlV0: null,
  tlT1: null,
  tlV1: null,
  tlExtendLeft: null,
  tlExtendRight: null,
  drawingRole: null,
  bundleId: null,
  combinator: null,
  conditions: [{ kind: "price", operator: "cross_above", price: 200, priceHigh: null }],
  watchlistId: null,
  symbolState: {},
  createdAt: "2026-07-22T12:00:00.000Z",
  updatedAt: "2026-07-22T12:00:00.000Z",
};

function mockAlertsPort(overrides: Partial<AlertsPort> = {}): AlertsPort {
  return {
    listAlerts: vi.fn().mockResolvedValue([sampleAlert]),
    getAlert: vi.fn().mockResolvedValue(sampleAlert),
    createAlert: vi.fn().mockResolvedValue(sampleAlert),
    patchAlert: vi.fn().mockResolvedValue({ ...sampleAlert, status: "paused" }),
    removeAlert: vi.fn().mockResolvedValue(true),
    listEvents: vi.fn().mockResolvedValue([
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        alertId,
        symbol: "AAPL",
        operator: "cross_above",
        triggerPrice: 200,
        quotePrice: 201,
        notificationId: null,
        createdAt: "2026-07-22T13:00:00.000Z",
      },
    ]),
    ...overrides,
  };
}

function baseMarketData(): ToolContext["marketData"] {
  return {
    searchSymbols: async () => [],
    getCandles: async () => ({ data: [], meta: { source: "test" } }),
    getQuotes: async () => ({
      data: [
        {
          symbol: "AAPL",
          regularMarketPrice: 199.5,
          regularMarketChange: 0.5,
          regularMarketChangePercent: 0.25,
          updatedAt: Date.now(),
        },
      ],
      meta: { source: "test", stale: false },
    }),
    getFundamentals: async () => ({ symbol: "AAPL", updatedAt: Date.now() }),
    getOptionExpirations: async () => [],
    getOptionsChain: async () => ({
      underlying: "AAPL",
      expiration: "2025-06-20",
      contracts: [],
    }),
  };
}

function createLayout(overrides: Partial<ChartLayout> = {}): ChartLayout {
  return {
    version: 1,
    layoutId: "n1",
    linkSymbol: false,
    linkInterval: false,
    linkCrosshair: false,
    linkDrawings: false,
    theme: "dark",
    activeCellIndex: 0,
    cells: [
      {
        symbol: "AAPL",
        range: "1y",
        interval: "1d",
        chartType: "candle_solid",
        indicators: [],
        drawings: [
          {
            id: "draw-1",
            name: "horizontal_line",
            label: "Resistance",
            points: [{ value: 210, timestamp: 1_700_000_000_000 }],
            visible: true,
            locked: false,
            zLevel: 0,
          },
        ],
      },
    ],
    toolbarPrefs: {},
    sidebar: { activePanel: "object-tree" },
    ...overrides,
  };
}

function mockContext(alerts: AlertsPort | null, layout = createLayout()): ToolContext {
  const loadSymbolIntoActiveChart = vi.fn();
  const applyCellUpdate = vi.fn((index: number, next: ChartLayout["cells"][number]) => {
    layout.cells[index] = next;
  });
  const setActiveCellIndex = vi.fn((index: number) => {
    layout.activeCellIndex = index;
  });

  return {
    clientSession: true,
    app: {
      getLayout: () => layout,
      isHydrated: () => true,
      applyCellUpdate,
      patchActiveCell: () => {},
      setActiveCellIndex,
      setLayoutId: () => {},
      setGridMode: () => {},
      setLayoutSync: () => {},
      setTheme: () => {},
      setSidebarPanel: () => {},
    },
    chart: {
      getActiveChart: () => ({ overlays: [], chartCommands: { getCandles: () => [] } }) as never,
      loadSymbolIntoActiveChart,
    },
    watchlist: null,
    screener: null,
    risk: null,
    account: null,
    options: null,
    scriptLibrary: null,
    marketData: baseMarketData(),
    trading: null,
    journal: null,
    alerts,
  };
}

describe("alerts AI tools — lifecycle", () => {
  it("list_alerts filters by status", async () => {
    const alerts = mockAlertsPort();
    const result = await listAlertsTool.execute({ status: "active" }, mockContext(alerts));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.count).toBe(1);
    expect(alerts.listAlerts).toHaveBeenCalled();
  });

  it("get_alert returns one alert", async () => {
    const alerts = mockAlertsPort();
    const result = await getAlertTool.execute({ alertId }, mockContext(alerts));
    expect(result.ok).toBe(true);
    expect(alerts.getAlert).toHaveBeenCalledWith(alertId);
  });

  it("create_alert delegates to port", async () => {
    const alerts = mockAlertsPort();
    const result = await createAlertTool.execute(
      { symbol: "AAPL", operator: "cross_above", price: 200 },
      mockContext(alerts),
    );
    expect(result.ok).toBe(true);
    expect(alerts.createAlert).toHaveBeenCalled();
  });

  it("update_alert patches alert", async () => {
    const alerts = mockAlertsPort();
    const result = await updateAlertTool.execute(
      { alertId, status: "paused" },
      mockContext(alerts),
    );
    expect(result.ok).toBe(true);
    expect(alerts.patchAlert).toHaveBeenCalledWith(alertId, { status: "paused" });
  });

  it("dismiss_alert pauses alert", async () => {
    const alerts = mockAlertsPort();
    const result = await dismissAlertTool.execute({ alertId }, mockContext(alerts));
    expect(result.ok).toBe(true);
    expect(alerts.patchAlert).toHaveBeenCalledWith(alertId, { status: "paused" });
  });

  it("delete_alert removes alert", async () => {
    const alerts = mockAlertsPort();
    const result = await deleteAlertTool.execute({ alertId }, mockContext(alerts));
    expect(result.ok).toBe(true);
    expect(alerts.removeAlert).toHaveBeenCalledWith(alertId);
  });

  it("list_alert_events returns trigger audit rows", async () => {
    const alerts = mockAlertsPort();
    const result = await listAlertEventsTool.execute({ alertId }, mockContext(alerts));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.count).toBe(1);
    expect(alerts.listEvents).toHaveBeenCalledWith(alertId);
  });

  it("create_watchlist_alert delegates to port", async () => {
    const alerts = mockAlertsPort();
    const result = await createWatchlistAlertTool.execute(
      { watchlistId: "wl-1", operator: "cross_above", price: 100 },
      mockContext(alerts),
    );
    expect(result.ok).toBe(true);
    expect(alerts.createAlert).toHaveBeenCalled();
  });
});

describe("alerts AI tools — chart workflow", () => {
  it("create_drawing_alert uses drawing geometry", async () => {
    const alerts = mockAlertsPort();
    const result = await createDrawingAlertTool.execute(
      { drawingId: "draw-1" },
      mockContext(alerts),
    );
    expect(result.ok).toBe(true);
    expect(alerts.createAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: "AAPL",
        drawingId: "draw-1",
        drawingKind: "horizontal_line",
      }),
    );
  });

  it("open_alert_on_chart loads symbol and returns deep links", async () => {
    const alerts = mockAlertsPort();
    const context = mockContext(alerts);
    const result = await openAlertOnChartTool.execute({ alertId }, context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.symbol).toBe("AAPL");
    expect(result.data.workspaceDeepLink).toContain("surface=alerts");
    expect(result.data.workspaceDeepLink).toContain("alertId=");
    expect(context.chart?.loadSymbolIntoActiveChart).toHaveBeenCalled();
  });

  it("preview_alert returns distance metadata", async () => {
    const alerts = mockAlertsPort();
    const result = await previewAlertTool.execute({ alertId }, mockContext(alerts));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.quotePrice).toBe(199.5);
    expect(result.data.targetPrice).toBe(200);
    expect(result.data.distance).toBeCloseTo(-0.5);
  });

  it("suggest_alerts_for_chart returns drawing suggestions", async () => {
    const alerts = mockAlertsPort();
    const result = await suggestAlertsForChartTool.execute({}, mockContext(alerts));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.drawingSuggestions).toHaveLength(1);
    expect(result.data.drawingSuggestions[0]?.drawingId).toBe("draw-1");
  });
});
