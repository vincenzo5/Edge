import { z } from "zod";
import { defineTool } from "../types";
import type { AiTool } from "../types";
import type { ToolContext } from "../context";
import type { AlertsPort } from "../alertsPort";
import type { AlertDefinitionResponse } from "@/lib/persistence/schemas/alerts";
import {
  ALERT_CONDITION_COMBINATORS,
  ALERT_DRAWING_KINDS,
  ALERT_INDICATOR_COMPARE_OPS,
  ALERT_INDICATOR_INTERVALS,
  ALERT_INDICATOR_NAMES,
  ALERT_OPERATORS,
  ALERT_RECURRENCE,
  ALERT_STATUSES,
  alertConditionSchema,
} from "@/lib/persistence/schemas/alerts";
import {
  formatConditionsSummary,
  getSymbolStateEntry,
  normalizeAlertConditions,
} from "@/lib/alerts/alertConditions";
import {
  buildAlertPrefillFromDrawing,
  isAlertableDrawingKind,
  resolveAlertEvaluationTarget,
} from "@/lib/alerts/drawingAlertGeometry";
import { evaluateAlertCondition } from "@/lib/alerts/evaluateAlerts";
import {
  buildTradePlanAlertInputs,
  createTradePlanAlerts,
} from "@/lib/alerts/tradePlanAlerts";
import {
  buildAlertPrefillWorkspaceLink,
} from "@/lib/alerts/openAlertPrefill";
import {
  isScriptSnapshotFresh,
} from "@/lib/alerts/scriptAlertEval";
import { buildWorkspaceDeepLink } from "@/lib/appWorkspace/deepLinks";
import {
  isPositionDrawingName,
  positionOrderLevelsFromDrawing,
} from "@/lib/trading/positionTradeSetup";
import { upsertScreenerAlertForScreen } from "@/lib/screener/screenerAlertClient";
import type { SerializedDrawing } from "@/lib/chart/contracts";
import { cellIndexSchema } from "../schemas";
import { getCell, requireApp } from "./_helpers";

function requireAlerts(context: ToolContext): AlertsPort {
  if (!context.alerts) {
    throw new Error("Alerts port unavailable");
  }
  return context.alerts;
}

function requireChartBridge(context: ToolContext) {
  if (!context.chart) {
    throw new Error("Chart bridge unavailable");
  }
  return context.chart;
}

async function resolveQuotePrice(
  context: ToolContext,
  symbol: string,
): Promise<{ price: number | null; stale?: boolean; source?: string }> {
  const delivery = await context.marketData.getQuotes([symbol.trim().toUpperCase()]);
  const quote = delivery.data[0];
  const price = quote?.regularMarketPrice;
  if (price == null || !Number.isFinite(price)) {
    return { price: null, stale: delivery.meta?.stale, source: delivery.meta?.source };
  }
  return {
    price,
    stale: delivery.meta?.stale,
    source: delivery.meta?.source,
  };
}

function findDrawingInCell(
  context: ToolContext,
  drawingId: string,
  cellIndex?: number,
): { drawing: SerializedDrawing; symbol: string; cellIndex: number } | null {
  const { index, cell } = getCell(context, cellIndex);
  const drawing = cell.drawings.find((item) => item.id === drawingId);
  if (!drawing) return null;
  const symbol = cell.symbol?.trim().toUpperCase();
  if (!symbol) return null;
  return { drawing, symbol, cellIndex: index };
}

function alertToPrefill(alert: AlertDefinitionResponse) {
  const priceCondition = normalizeAlertConditions(alert).find(
    (condition) => condition.kind === "price",
  );
  const scriptCondition = normalizeAlertConditions(alert).find(
    (condition) => condition.kind === "script_condition",
  );

  return {
    symbol: alert.symbol,
    operator: priceCondition?.kind === "price" ? priceCondition.operator : alert.operator,
    price: priceCondition?.kind === "price" ? priceCondition.price : alert.price,
    message: alert.message ?? undefined,
    drawingId: alert.drawingId ?? undefined,
    drawingKind: alert.drawingKind ?? undefined,
    priceHigh: alert.priceHigh ?? undefined,
    tlT0: alert.tlT0 ?? undefined,
    tlV0: alert.tlV0 ?? undefined,
    tlT1: alert.tlT1 ?? undefined,
    tlV1: alert.tlV1 ?? undefined,
    tlExtendLeft: alert.tlExtendLeft ?? undefined,
    tlExtendRight: alert.tlExtendRight ?? undefined,
    scriptId: scriptCondition?.kind === "script_condition" ? scriptCondition.scriptId : undefined,
    revision:
      scriptCondition?.kind === "script_condition" ? scriptCondition.revision : undefined,
    conditionId:
      scriptCondition?.kind === "script_condition" ? scriptCondition.conditionId : undefined,
    scriptTitle:
      scriptCondition?.kind === "script_condition" ? scriptCondition.title : undefined,
  };
}

const alertStatusFilterSchema = z.enum(ALERT_STATUSES);
const alertConditionInputSchema = alertConditionSchema;

export const listAlertsTool = defineTool({
  name: "list_alerts",
  description: "List alert definitions for the current user. Optional filters by status, symbol, or watchlistId.",
  inputSchema: z.object({
    status: alertStatusFilterSchema.optional(),
    symbol: z.string().trim().max(16).optional(),
    watchlistId: z.string().trim().max(64).optional(),
  }),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const alerts = await requireAlerts(context).listAlerts();
    const filtered = alerts.filter((alert) => {
      if (input.status && alert.status !== input.status) return false;
      if (input.symbol && alert.symbol !== input.symbol.trim().toUpperCase()) return false;
      if (input.watchlistId && alert.watchlistId !== input.watchlistId) return false;
      return true;
    });
    return {
      ok: true,
      data: {
        alerts: filtered,
        count: filtered.length,
      },
    };
  },
});

export const getAlertTool = defineTool({
  name: "get_alert",
  description: "Load one alert definition by id.",
  inputSchema: z.object({
    alertId: z.string().uuid(),
  }),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const alert = await requireAlerts(context).getAlert(input.alertId);
    if (!alert) {
      return { ok: false, error: "Alert not found", code: "not_found" };
    }
    return { ok: true, data: { alert } };
  },
});

export const createAlertTool = defineTool({
  name: "create_alert",
  description:
    "Create a price or multi-condition alert. Provide symbol or watchlistId plus either operator+price or a conditions array (max 2 legs).",
  inputSchema: z.object({
    symbol: z.string().trim().max(16).optional(),
    watchlistId: z.string().trim().max(64).optional(),
    operator: z.enum(ALERT_OPERATORS).optional(),
    price: z.number().finite().optional(),
    priceHigh: z.number().finite().nullable().optional(),
    message: z.string().trim().max(500).nullable().optional(),
    recurrence: z.enum(ALERT_RECURRENCE).optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    combinator: z.enum(ALERT_CONDITION_COMBINATORS).nullable().optional(),
    conditions: z.array(alertConditionInputSchema).min(1).max(2).optional(),
    drawingId: z.string().trim().min(1).max(128).optional(),
    drawingKind: z.enum(ALERT_DRAWING_KINDS).optional(),
    drawingRole: z.enum(["entry", "stop", "target"]).optional(),
    bundleId: z.string().uuid().optional(),
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const alert = await requireAlerts(context).createAlert(input);
    return { ok: true, data: { alert } };
  },
});

export const updateAlertTool = defineTool({
  name: "update_alert",
  description: "Patch an alert definition (status, price, message, expiry, conditions, etc.).",
  inputSchema: z
    .object({
      alertId: z.string().uuid(),
      symbol: z.string().trim().max(16).nullable().optional(),
      watchlistId: z.string().trim().max(64).nullable().optional(),
      operator: z.enum(ALERT_OPERATORS).optional(),
      price: z.number().finite().optional(),
      priceHigh: z.number().finite().nullable().optional(),
      message: z.string().trim().max(500).nullable().optional(),
      recurrence: z.enum(ALERT_RECURRENCE).optional(),
      status: alertStatusFilterSchema.optional(),
      expiresAt: z.string().datetime().nullable().optional(),
      combinator: z.enum(ALERT_CONDITION_COMBINATORS).nullable().optional(),
      conditions: z.array(alertConditionInputSchema).min(1).max(2).optional(),
    })
    .refine((value) => Object.keys(value).length > 1, {
      message: "At least one patch field besides alertId is required.",
    }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const { alertId, ...patch } = input;
    const alert = await requireAlerts(context).patchAlert(alertId, patch);
    if (!alert) {
      return { ok: false, error: "Alert not found", code: "not_found" };
    }
    return { ok: true, data: { alert } };
  },
});

export const dismissAlertTool = defineTool({
  name: "dismiss_alert",
  description: "Pause an active alert without deleting it.",
  inputSchema: z.object({
    alertId: z.string().uuid(),
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const alert = await requireAlerts(context).patchAlert(input.alertId, { status: "paused" });
    if (!alert) {
      return { ok: false, error: "Alert not found", code: "not_found" };
    }
    return { ok: true, data: { alert } };
  },
});

export const deleteAlertTool = defineTool({
  name: "delete_alert",
  description: "Permanently delete an alert definition.",
  inputSchema: z.object({
    alertId: z.string().uuid(),
  }),
  permission: "destructive",
  requiresConfirmation: true,
  requiresClientSession: true,
  async execute(input, context) {
    const deleted = await requireAlerts(context).removeAlert(input.alertId);
    if (!deleted) {
      return { ok: false, error: "Alert not found", code: "not_found" };
    }
    return { ok: true, data: { alertId: input.alertId, deleted: true } };
  },
});

export const listAlertEventsTool = defineTool({
  name: "list_alert_events",
  description: "List recent alert trigger audit events (last 50). Optional filter by alertId.",
  inputSchema: z.object({
    alertId: z.string().uuid().optional(),
  }),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const events = await requireAlerts(context).listEvents(input.alertId);
    return { ok: true, data: { events, count: events.length } };
  },
});

export const createDrawingAlertTool = defineTool({
  name: "create_drawing_alert",
  description:
    "Create an alert bound to a chart drawing (horizontal line, trend line, or rectangle) on the active or specified cell.",
  inputSchema: z.object({
    drawingId: z.string().trim().min(1).max(128),
    cellIndex: cellIndexSchema,
    message: z.string().trim().max(500).optional(),
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    requireApp(context);
    const match = findDrawingInCell(context, input.drawingId, input.cellIndex);
    if (!match) {
      return { ok: false, error: "Drawing not found on chart cell", code: "not_found" };
    }
    if (!isAlertableDrawingKind(match.drawing.name)) {
      return { ok: false, error: "Drawing kind is not alertable", code: "validation" };
    }

    const quote = await resolveQuotePrice(context, match.symbol);
    const prefill = buildAlertPrefillFromDrawing({
      symbol: match.symbol,
      drawing: match.drawing,
      quotePrice: quote.price,
    });
    if (!prefill) {
      return { ok: false, error: "Could not derive alert geometry from drawing", code: "validation" };
    }

    const alert = await requireAlerts(context).createAlert({
      ...prefill,
      message: input.message ?? null,
      recurrence: "once",
    });
    return { ok: true, data: { alert, cellIndex: match.cellIndex } };
  },
});

export const createTradePlanAlertsTool = defineTool({
  name: "create_trade_plan_alerts",
  description:
    "Create entry/stop/target price alerts from a long/short position drawing on the chart.",
  inputSchema: z.object({
    drawingId: z.string().trim().min(1).max(128),
    cellIndex: cellIndexSchema,
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    requireApp(context);
    const match = findDrawingInCell(context, input.drawingId, input.cellIndex);
    if (!match) {
      return { ok: false, error: "Drawing not found on chart cell", code: "not_found" };
    }
    if (!isPositionDrawingName(match.drawing.name)) {
      return { ok: false, error: "Drawing is not a position overlay", code: "validation" };
    }
    const levels = positionOrderLevelsFromDrawing(match.drawing);
    if (!levels) {
      return { ok: false, error: "Could not derive trade plan levels", code: "validation" };
    }

    const alerts = await createTradePlanAlerts({
      symbol: match.symbol,
      drawingId: match.drawing.id!,
      levels,
    });
    return {
      ok: true,
      data: {
        alerts,
        bundleId: alerts[0]?.bundleId ?? null,
        cellIndex: match.cellIndex,
      },
    };
  },
});

export const createIndicatorAlertTool = defineTool({
  name: "create_indicator_alert",
  description: "Create an indicator level or cross alert on a symbol or watchlist.",
  inputSchema: z.discriminatedUnion("mode", [
    z.object({
      mode: z.literal("level"),
      symbol: z.string().trim().max(16).optional(),
      watchlistId: z.string().trim().max(64).optional(),
      indicator: z.enum(ALERT_INDICATOR_NAMES),
      series: z.string().trim().min(1).max(32),
      interval: z.enum(ALERT_INDICATOR_INTERVALS).default("1d"),
      op: z.enum(ALERT_INDICATOR_COMPARE_OPS),
      threshold: z.number().finite(),
      inputs: z
        .record(z.string(), z.union([z.number(), z.string(), z.boolean()]))
        .optional(),
      message: z.string().trim().max(500).optional(),
    }),
    z.object({
      mode: z.literal("cross"),
      symbol: z.string().trim().max(16).optional(),
      watchlistId: z.string().trim().max(64).optional(),
      indicator: z.enum(ALERT_INDICATOR_NAMES),
      seriesA: z.string().trim().min(1).max(32),
      seriesB: z.string().trim().min(1).max(32),
      interval: z.enum(ALERT_INDICATOR_INTERVALS).default("1d"),
      direction: z.enum(["above", "below"]),
      inputs: z
        .record(z.string(), z.union([z.number(), z.string(), z.boolean()]))
        .optional(),
      message: z.string().trim().max(500).optional(),
    }),
  ]),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const hasWatchlist = Boolean(input.watchlistId);
    const hasSymbol = Boolean(input.symbol?.trim());
    if (hasWatchlist === hasSymbol) {
      return {
        ok: false,
        error: "Provide exactly one of symbol or watchlistId",
        code: "validation",
      };
    }

    const condition =
      input.mode === "level"
        ? {
            kind: "indicator_level" as const,
            indicator: input.indicator,
            series: input.series,
            interval: input.interval,
            op: input.op,
            threshold: input.threshold,
            inputs: input.inputs,
          }
        : {
            kind: "indicator_cross" as const,
            indicator: input.indicator,
            seriesA: input.seriesA,
            seriesB: input.seriesB,
            interval: input.interval,
            direction: input.direction,
            inputs: input.inputs,
          };

    const alert = await requireAlerts(context).createAlert({
      symbol: input.symbol?.trim().toUpperCase(),
      watchlistId: input.watchlistId,
      conditions: [condition],
      operator: "touch_above",
      price: 0,
      message: input.message ?? null,
      recurrence: "once",
    });
    return { ok: true, data: { alert } };
  },
});

export const createScriptAlertTool = defineTool({
  name: "create_script_alert",
  description:
    "Arm a script condition alert. Requires an open chart session to post snapshots after create.",
  inputSchema: z.object({
    symbol: z.string().trim().min(1).max(16),
    scriptId: z.string().trim().min(1).max(128),
    revision: z.string().trim().min(1).max(128),
    conditionId: z.string().trim().min(1).max(32),
    title: z.string().trim().max(120).optional(),
    message: z.string().trim().max(500).optional(),
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const alert = await requireAlerts(context).createAlert({
      symbol: input.symbol.trim().toUpperCase(),
      conditions: [
        {
          kind: "script_condition",
          scriptId: input.scriptId,
          revision: input.revision,
          conditionId: input.conditionId,
          title: input.title,
        },
      ],
      operator: "touch_above",
      price: 0,
      message: input.message ?? null,
      recurrence: "once",
    });
    return { ok: true, data: { alert } };
  },
});

export const createWatchlistAlertTool = defineTool({
  name: "create_watchlist_alert",
  description: "Create a watchlist-scoped price alert that fires per symbol.",
  inputSchema: z.object({
    watchlistId: z.string().trim().min(1).max(64),
    operator: z.enum(ALERT_OPERATORS),
    price: z.number().finite(),
    priceHigh: z.number().finite().nullable().optional(),
    message: z.string().trim().max(500).optional(),
    recurrence: z.enum(ALERT_RECURRENCE).optional(),
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const alert = await requireAlerts(context).createAlert({
      watchlistId: input.watchlistId,
      operator: input.operator,
      price: input.price,
      priceHigh: input.priceHigh ?? null,
      message: input.message ?? null,
      recurrence: input.recurrence ?? "once",
    });
    return { ok: true, data: { alert } };
  },
});

export const setScreenerNotifyTool = defineTool({
  name: "set_screener_notify",
  description: "Enable or disable screener match notifications for a saved screen.",
  inputSchema: z.object({
    screenId: z.string().trim().min(1).max(128),
    enabled: z.boolean(),
    intervalMinutes: z.union([z.literal(15), z.literal(60)]).default(60),
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    void context;
    const screenerAlert = await upsertScreenerAlertForScreen({
      screenId: input.screenId,
      enabled: input.enabled,
      intervalMinutes: input.intervalMinutes,
    });
    return {
      ok: true,
      data: {
        enabled: input.enabled,
        screenerAlert,
      },
    };
  },
});

export const openAlertOnChartTool = defineTool({
  name: "open_alert_on_chart",
  description:
    "Load an alert's symbol on the chart and return the workspace deep link to the alerts surface.",
  inputSchema: z.object({
    alertId: z.string().uuid(),
    cellIndex: cellIndexSchema,
    symbolOverride: z.string().trim().max(16).optional(),
  }),
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const alerts = requireAlerts(context);
    const alert = await alerts.getAlert(input.alertId);
    if (!alert) {
      return { ok: false, error: "Alert not found", code: "not_found" };
    }

    const symbol =
      input.symbolOverride?.trim().toUpperCase() ??
      (alert.symbol !== "*" ? alert.symbol : null);
    if (!symbol) {
      return {
        ok: false,
        error: "Watchlist alert requires symbolOverride",
        code: "validation",
      };
    }

    const app = requireApp(context);
    const chartBridge = requireChartBridge(context);
    if (input.cellIndex != null) {
      app.setActiveCellIndex(input.cellIndex);
    }
    const { index, cell } = getCell(context, input.cellIndex);
    chartBridge.loadSymbolIntoActiveChart({
      symbol,
      name: symbol,
      exchange: "",
    });
    app.applyCellUpdate(index, {
      ...cell,
      symbol,
      symbolName: symbol,
    });

    const prefill = alertToPrefill(alert);
    if (prefill.symbol === "*") {
      prefill.symbol = symbol;
    }
    const workspaceDeepLink = buildWorkspaceDeepLink({
      surface: "alerts",
      selectedAlertId: alert.id,
    });
    const prefillLink = buildAlertPrefillWorkspaceLink(prefill);

    return {
      ok: true,
      data: {
        alertId: alert.id,
        symbol,
        cellIndex: index,
        workspaceDeepLink,
        prefillLink,
      },
    };
  },
});

export const previewAlertTool = defineTool({
  name: "preview_alert",
  description:
    "Preview alert distance to trigger using the latest quote. Does not run cron evaluation.",
  inputSchema: z.object({
    alertId: z.string().uuid(),
    symbol: z.string().trim().max(16).optional(),
  }),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    const alert = await requireAlerts(context).getAlert(input.alertId);
    if (!alert) {
      return { ok: false, error: "Alert not found", code: "not_found" };
    }

    const quoteSymbol =
      input.symbol?.trim().toUpperCase() ??
      (alert.symbol !== "*" ? alert.symbol : null);
    if (!quoteSymbol) {
      return {
        ok: false,
        error: "Watchlist alert requires symbol for preview",
        code: "validation",
      };
    }

    const quote = await resolveQuotePrice(context, quoteSymbol);
    const target = resolveAlertEvaluationTarget(alert);
    const stateEntry = getSymbolStateEntry(alert.symbolState, quoteSymbol);
    const hasScriptLeg = normalizeAlertConditions(alert).some(
      (condition) => condition.kind === "script_condition",
    );

    let distance: number | null = null;
    let distancePct: number | null = null;
    let wouldTriggerNow: boolean | null = null;

    if (target && quote.price != null) {
      distance = quote.price - target.targetPrice;
      if (target.targetPrice !== 0) {
        distancePct = (distance / target.targetPrice) * 100;
      }
      wouldTriggerNow = evaluateAlertCondition({
        operator: alert.operator,
        targetPrice: target.targetPrice,
        quotePrice: quote.price,
        previousPrice: stateEntry.lastPrice ?? null,
        zoneHigh: target.zoneHigh ?? alert.priceHigh,
      });
    }

    return {
      ok: true,
      data: {
        alertId: alert.id,
        status: alert.status,
        summary: formatConditionsSummary(alert),
        quoteSymbol,
        quotePrice: quote.price,
        quoteStale: quote.stale ?? false,
        quoteSource: quote.source ?? null,
        targetPrice: target?.targetPrice ?? null,
        zoneHigh: target?.zoneHigh ?? alert.priceHigh ?? null,
        distance,
        distancePct,
        wouldTriggerNow,
        lastFiredAt: alert.lastFiredAt ?? stateEntry.lastFiredAt ?? null,
        scriptSnapshotFresh: hasScriptLeg
          ? isScriptSnapshotFresh(stateEntry)
          : null,
        lastScriptSatisfied: hasScriptLeg ? stateEntry.lastScriptSatisfied ?? null : null,
      },
    };
  },
});

export const suggestAlertsForChartTool = defineTool({
  name: "suggest_alerts_for_chart",
  description:
    "Suggest alert candidates from alertable drawings and position overlays on a chart cell without creating alerts.",
  inputSchema: z.object({
    cellIndex: cellIndexSchema,
  }),
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: true,
  async execute(input, context) {
    requireApp(context);
    const { index, cell } = getCell(context, input.cellIndex);
    const symbol = cell.symbol?.trim().toUpperCase();
    if (!symbol) {
      return { ok: false, error: "Chart cell has no symbol", code: "validation" };
    }

    const quote = await resolveQuotePrice(context, symbol);
    const drawingSuggestions: Array<{
      kind: "drawing";
      drawingId: string;
      drawingKind: string;
      operator: string;
      price: number;
      priceHigh?: number;
    }> = [];
    const tradePlanSuggestions: Array<{
      kind: "trade_plan";
      drawingId: string;
      direction: string;
      levels: ReturnType<typeof positionOrderLevelsFromDrawing>;
    }> = [];

    for (const drawing of cell.drawings) {
      if (!drawing.id) continue;
      if (isAlertableDrawingKind(drawing.name)) {
        const prefill = buildAlertPrefillFromDrawing({
          symbol,
          drawing,
          quotePrice: quote.price,
        });
        if (prefill) {
          drawingSuggestions.push({
            kind: "drawing",
            drawingId: prefill.drawingId,
            drawingKind: prefill.drawingKind,
            operator: prefill.operator,
            price: prefill.price,
            priceHigh: prefill.priceHigh,
          });
        }
      }
      if (isPositionDrawingName(drawing.name)) {
        const levels = positionOrderLevelsFromDrawing(drawing);
        if (levels) {
          tradePlanSuggestions.push({
            kind: "trade_plan",
            drawingId: drawing.id,
            direction: levels.direction,
            levels,
          });
        }
      }
    }

    return {
      ok: true,
      data: {
        cellIndex: index,
        symbol,
        quotePrice: quote.price,
        drawingSuggestions,
        tradePlanSuggestions,
        tradePlanPreview: tradePlanSuggestions.map((item) => ({
          drawingId: item.drawingId,
          alerts: buildTradePlanAlertInputs({
            symbol,
            drawingId: item.drawingId,
            levels: item.levels!,
          }).map((candidate) => ({
            drawingRole: candidate.drawingRole,
            operator: candidate.operator,
            price: candidate.price,
            message: candidate.message,
          })),
        })),
      },
    };
  },
});

export const alertsTools: AiTool[] = [
  listAlertsTool,
  getAlertTool,
  createAlertTool,
  updateAlertTool,
  dismissAlertTool,
  deleteAlertTool,
  listAlertEventsTool,
  createDrawingAlertTool,
  createTradePlanAlertsTool,
  createIndicatorAlertTool,
  createScriptAlertTool,
  createWatchlistAlertTool,
  setScreenerNotifyTool,
  openAlertOnChartTool,
  previewAlertTool,
  suggestAlertsForChartTool,
];
