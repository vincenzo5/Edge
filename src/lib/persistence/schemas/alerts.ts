import { z } from "zod";

export const ALERT_OPERATORS = [
  "cross_above",
  "cross_below",
  "touch_above",
  "touch_below",
  "enter_zone",
  "exit_zone",
] as const;

export const ALERT_DRAWING_KINDS = ["horizontal_line", "trend_line", "rectangle"] as const;
export const ALERT_DRAWING_ROLES = ["entry", "stop", "target"] as const;
export const ALERT_RECURRENCE = ["once", "recurring"] as const;
export const ALERT_STATUSES = ["active", "paused", "triggered", "expired"] as const;
export const ALERT_CONDITION_COMBINATORS = ["and", "or"] as const;
export const ALERT_INDICATOR_COMPARE_OPS = [">", ">=", "<", "<=", "=="] as const;
export const ALERT_INDICATOR_NAMES = ["RSI", "MACD", "MA", "EMA"] as const;
export const ALERT_INDICATOR_INTERVALS = ["5m", "15m", "30m", "1h", "1d", "1wk"] as const;

export type AlertOperator = (typeof ALERT_OPERATORS)[number];
export type AlertDrawingKind = (typeof ALERT_DRAWING_KINDS)[number];
export type AlertDrawingRole = (typeof ALERT_DRAWING_ROLES)[number];
export type AlertRecurrence = (typeof ALERT_RECURRENCE)[number];
export type AlertStatus = (typeof ALERT_STATUSES)[number];
export type AlertConditionCombinator = (typeof ALERT_CONDITION_COMBINATORS)[number];
export type AlertIndicatorCompareOp = (typeof ALERT_INDICATOR_COMPARE_OPS)[number];
export type AlertIndicatorName = (typeof ALERT_INDICATOR_NAMES)[number];
export type AlertIndicatorInterval = (typeof ALERT_INDICATOR_INTERVALS)[number];

export const alertDrawingBindSchema = z.object({
  drawingId: z.string().trim().min(1).max(128),
  drawingKind: z.enum(ALERT_DRAWING_KINDS),
  priceHigh: z.number().finite().nullable().optional(),
  tlT0: z.number().finite().nullable().optional(),
  tlV0: z.number().finite().nullable().optional(),
  tlT1: z.number().finite().nullable().optional(),
  tlV1: z.number().finite().nullable().optional(),
  tlExtendLeft: z.boolean().nullable().optional(),
  tlExtendRight: z.boolean().nullable().optional(),
});

export const alertPriceConditionSchema = z.object({
  kind: z.literal("price"),
  operator: z.enum(ALERT_OPERATORS),
  price: z.number().finite(),
  priceHigh: z.number().finite().nullable().optional(),
});

export const alertIndicatorLevelConditionSchema = z.object({
  kind: z.literal("indicator_level"),
  indicator: z.enum(ALERT_INDICATOR_NAMES),
  inputs: z
    .record(z.string(), z.union([z.number(), z.string(), z.boolean()]))
    .optional(),
  series: z.string().trim().min(1).max(32),
  interval: z.enum(ALERT_INDICATOR_INTERVALS).default("1d"),
  op: z.enum(ALERT_INDICATOR_COMPARE_OPS),
  threshold: z.number().finite(),
});

export const alertIndicatorCrossConditionSchema = z.object({
  kind: z.literal("indicator_cross"),
  indicator: z.enum(ALERT_INDICATOR_NAMES),
  inputs: z
    .record(z.string(), z.union([z.number(), z.string(), z.boolean()]))
    .optional(),
  interval: z.enum(ALERT_INDICATOR_INTERVALS).default("1d"),
  seriesA: z.string().trim().min(1).max(32),
  seriesB: z.string().trim().min(1).max(32),
  direction: z.enum(["above", "below"]),
});

export const alertScriptConditionSchema = z.object({
  kind: z.literal("script_condition"),
  scriptId: z.string().trim().min(1).max(128),
  revision: z.string().trim().min(1).max(128),
  conditionId: z.string().trim().min(1).max(32),
  title: z.string().trim().max(120).optional(),
});

export const alertConditionSchema = z.discriminatedUnion("kind", [
  alertPriceConditionSchema,
  alertIndicatorLevelConditionSchema,
  alertIndicatorCrossConditionSchema,
  alertScriptConditionSchema,
]);

export const alertSymbolStateEntrySchema = z.object({
  lastPrice: z.number().nullable().optional(),
  lastSatisfied: z.boolean().optional(),
  lastFiredAt: z.string().nullable().optional(),
  lastSeriesA: z.number().nullable().optional(),
  lastSeriesB: z.number().nullable().optional(),
  lastScriptSatisfied: z.boolean().optional(),
  lastScriptBarTime: z.number().nullable().optional(),
  lastScriptSnapshotAt: z.string().nullable().optional(),
});

export const alertSymbolStateSchema = z.record(z.string(), alertSymbolStateEntrySchema);

export type AlertPriceCondition = z.infer<typeof alertPriceConditionSchema>;
export type AlertIndicatorLevelCondition = z.infer<typeof alertIndicatorLevelConditionSchema>;
export type AlertIndicatorCrossCondition = z.infer<typeof alertIndicatorCrossConditionSchema>;
export type AlertScriptCondition = z.infer<typeof alertScriptConditionSchema>;
export type AlertCondition = z.infer<typeof alertConditionSchema>;
export type AlertSymbolStateEntry = z.infer<typeof alertSymbolStateEntrySchema>;
export type AlertSymbolState = z.infer<typeof alertSymbolStateSchema>;

export const alertDefinitionSchema = z.object({
  id: z.string().uuid(),
  symbol: z.string().min(1),
  operator: z.enum(ALERT_OPERATORS),
  price: z.number().finite(),
  message: z.string().nullable().optional(),
  recurrence: z.enum(ALERT_RECURRENCE),
  status: z.enum(ALERT_STATUSES),
  cooldownMs: z.number().int().positive(),
  expiresAt: z.string().nullable().optional(),
  lastPrice: z.number().nullable().optional(),
  lastFiredAt: z.string().nullable().optional(),
  drawingId: z.string().nullable().optional(),
  drawingKind: z.enum(ALERT_DRAWING_KINDS).nullable().optional(),
  priceHigh: z.number().finite().nullable().optional(),
  tlT0: z.number().finite().nullable().optional(),
  tlV0: z.number().finite().nullable().optional(),
  tlT1: z.number().finite().nullable().optional(),
  tlV1: z.number().finite().nullable().optional(),
  tlExtendLeft: z.boolean().nullable().optional(),
  tlExtendRight: z.boolean().nullable().optional(),
  drawingRole: z.enum(ALERT_DRAWING_ROLES).nullable().optional(),
  bundleId: z.string().uuid().nullable().optional(),
  combinator: z.enum(ALERT_CONDITION_COMBINATORS).nullable().optional(),
  conditions: z.array(alertConditionSchema).min(1).max(2),
  watchlistId: z.string().trim().min(1).max(64).nullable().optional(),
  symbolState: alertSymbolStateSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const alertListResponseSchema = z.object({
  alerts: z.array(alertDefinitionSchema),
});

const alertConditionsInputSchema = z.array(alertConditionSchema).min(1).max(2);

function validateConditionsWithCombinator(
  value: { combinator?: AlertConditionCombinator | null; conditions?: AlertCondition[] },
  ctx: z.RefinementCtx,
): void {
  const conditions = value.conditions;
  if (!conditions) return;
  if (conditions.length === 2 && !value.combinator) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "combinator is required when two conditions are provided.",
      path: ["combinator"],
    });
  }
  if (conditions.length === 1 && value.combinator) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "combinator must be omitted for a single condition.",
      path: ["combinator"],
    });
  }
}

export const createAlertSchema = z
  .object({
    symbol: z.string().trim().min(1).max(16).optional(),
    watchlistId: z.string().trim().min(1).max(64).optional(),
    operator: z.enum(ALERT_OPERATORS).optional(),
    price: z.number().finite().optional(),
    message: z.string().trim().max(500).nullable().optional(),
    recurrence: z.enum(ALERT_RECURRENCE).default("once"),
    expiresAt: z.string().datetime().nullable().optional(),
    combinator: z.enum(ALERT_CONDITION_COMBINATORS).nullable().optional(),
    conditions: alertConditionsInputSchema.optional(),
    drawingId: z.string().trim().min(1).max(128).optional(),
    drawingKind: z.enum(ALERT_DRAWING_KINDS).optional(),
    priceHigh: z.number().finite().nullable().optional(),
    tlT0: z.number().finite().nullable().optional(),
    tlV0: z.number().finite().nullable().optional(),
    tlT1: z.number().finite().nullable().optional(),
    tlV1: z.number().finite().nullable().optional(),
    tlExtendLeft: z.boolean().nullable().optional(),
    tlExtendRight: z.boolean().nullable().optional(),
    drawingRole: z.enum(ALERT_DRAWING_ROLES).optional(),
    bundleId: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    validateConditionsWithCombinator(value, ctx);
    const hasWatchlist = Boolean(value.watchlistId);
    const hasSymbol = Boolean(value.symbol?.trim());
    if (hasWatchlist && hasSymbol) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either symbol or watchlistId, not both.",
        path: ["watchlistId"],
      });
    }
    if (!hasWatchlist && !hasSymbol) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "symbol or watchlistId is required.",
        path: ["symbol"],
      });
    }
    if (value.drawingId && value.conditions && value.conditions.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Drawing-bound alerts support only one condition.",
        path: ["conditions"],
      });
    }
    if (!value.conditions) {
      if (value.operator == null || value.price == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "operator and price are required when conditions are omitted.",
          path: ["operator"],
        });
      }
    }
  });

export const patchAlertSchema = z
  .object({
    symbol: z.string().trim().min(1).max(16).nullable().optional(),
    watchlistId: z.string().trim().min(1).max(64).nullable().optional(),
    operator: z.enum(ALERT_OPERATORS).optional(),
    price: z.number().finite().optional(),
    message: z.string().trim().max(500).nullable().optional(),
    recurrence: z.enum(ALERT_RECURRENCE).optional(),
    status: z.enum(ALERT_STATUSES).optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    combinator: z.enum(ALERT_CONDITION_COMBINATORS).nullable().optional(),
    conditions: alertConditionsInputSchema.optional(),
    drawingId: z.string().trim().min(1).max(128).nullable().optional(),
    drawingKind: z.enum(ALERT_DRAWING_KINDS).nullable().optional(),
    priceHigh: z.number().finite().nullable().optional(),
    tlT0: z.number().finite().nullable().optional(),
    tlV0: z.number().finite().nullable().optional(),
    tlT1: z.number().finite().nullable().optional(),
    tlV1: z.number().finite().nullable().optional(),
    tlExtendLeft: z.boolean().nullable().optional(),
    tlExtendRight: z.boolean().nullable().optional(),
    drawingRole: z.enum(ALERT_DRAWING_ROLES).nullable().optional(),
    bundleId: z.string().uuid().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    validateConditionsWithCombinator(value, ctx);
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided.",
      });
    }
    if (value.symbol != null && value.watchlistId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either symbol or watchlistId, not both.",
        path: ["watchlistId"],
      });
    }
  });

export const alertTriggerEventSchema = z.object({
  id: z.string().uuid(),
  alertId: z.string().uuid(),
  symbol: z.string(),
  operator: z.enum(ALERT_OPERATORS),
  triggerPrice: z.number(),
  quotePrice: z.number(),
  notificationId: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
});

export const alertEventsListResponseSchema = z.object({
  events: z.array(alertTriggerEventSchema),
});

export type AlertDefinitionResponse = z.infer<typeof alertDefinitionSchema>;
export type AlertTriggerEventResponse = z.infer<typeof alertTriggerEventSchema>;

export const postAlertSnapshotSchema = z.object({
  symbol: z.string().trim().min(1).max(16),
  satisfied: z.boolean(),
  barTime: z.number().finite(),
});

export type PostAlertSnapshotInput = z.infer<typeof postAlertSnapshotSchema>;

export type ActiveAlertDefinition = AlertDefinitionResponse & {
  userId: string;
};
