import { z } from "zod";

import { OrderSideSchema, TradingEnvironmentSchema } from "../types";
import { BracketStopLegSchema } from "../types";

/** Locked entry geometry at attach/fill — R unit is |entry − initialStop|, not dollar risk. */
export const PositionPlanSchema = z
  .object({
    symbol: z.string().min(1),
    accountId: z.string().min(1),
    side: OrderSideSchema,
    entry: z.number().positive(),
    initialStop: z.number().positive(),
    qty: z.number().positive(),
    rUnit: z.number().positive(),
    environment: TradingEnvironmentSchema,
    lockedAt: z.string().datetime(),
  })
  .superRefine((value, ctx) => {
    const expectedR = Math.abs(value.entry - value.initialStop);
    if (Math.abs(value.rUnit - expectedR) > 1e-9) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rUnit must equal |entry − initialStop|",
        path: ["rUnit"],
      });
    }
    if (value.side === "BUY" && value.initialStop >= value.entry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Long initialStop must be below entry",
        path: ["initialStop"],
      });
    }
    if (value.side === "SELL" && value.initialStop <= value.entry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Short initialStop must be above entry",
        path: ["initialStop"],
      });
    }
  });

export type PositionPlan = z.infer<typeof PositionPlanSchema>;

export function lockPositionPlan(args: {
  symbol: string;
  accountId: string;
  side: PositionPlan["side"];
  entry: number;
  initialStop: number;
  qty: number;
  environment: PositionPlan["environment"];
  lockedAt?: string;
}): PositionPlan {
  const rUnit = Math.abs(args.entry - args.initialStop);
  return PositionPlanSchema.parse({
    ...args,
    symbol: args.symbol.trim().toUpperCase(),
    rUnit,
    lockedAt: args.lockedAt ?? new Date().toISOString(),
  });
}

export function priceAtMultipleOfR(plan: PositionPlan, multiple: number): number {
  if (plan.side === "BUY") {
    return plan.entry + multiple * plan.rUnit;
  }
  return plan.entry - multiple * plan.rUnit;
}

export const PlaybookWhenSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("priceCross"),
    price: z.number().positive(),
    direction: z.enum(["above", "below"]).optional(),
  }),
  z.object({
    kind: z.literal("multipleOfR"),
    multiple: z.number().positive(),
  }),
  z.object({
    kind: z.literal("sessionFlatten"),
    /** Minutes before regular session close (US equity default 16:00 ET). */
    minutesBeforeClose: z.number().int().positive().default(5),
  }),
  z.object({
    kind: z.literal("protectiveFill"),
  }),
  z.object({
    kind: z.literal("scaleFill"),
    /** Optional rule id of the scale step that must fill first. */
    ruleId: z.string().min(1).optional(),
  }),
]);

export type PlaybookWhen = z.infer<typeof PlaybookWhenSchema>;

export const PlaybookThenSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("modifyStop"),
    stopPrice: z.number().positive().optional(),
    /** When true, stop moves to locked entry (break-even). */
    breakEven: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("reduceQty"),
    /** Fraction of filled qty to exit (0–1). */
    fraction: z.number().positive().max(1),
  }),
  z.object({
    kind: z.literal("attachTrail"),
    stopLeg: BracketStopLegSchema,
  }),
  z.object({
    kind: z.literal("flatten"),
  }),
  z.object({
    kind: z.literal("notify"),
    message: z.string().min(1).optional(),
  }),
]);

export type PlaybookThen = z.infer<typeof PlaybookThenSchema>;

export const PlaybookRuleSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1).optional(),
    when: PlaybookWhenSchema,
    then: PlaybookThenSchema,
    once: z.boolean().default(true),
    requires: z.array(z.string().min(1)).optional(),
    priority: z.number().int().optional(),
  })
  .superRefine((value, ctx) => {
    const { then } = value;
    if (then.kind === "modifyStop" && then.breakEven !== true && then.stopPrice == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "modifyStop requires stopPrice or breakEven",
        path: ["then", "stopPrice"],
      });
    }
    if (then.kind === "attachTrail" && then.stopLeg.mode !== "trail") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "attachTrail requires trail stopLeg",
        path: ["then", "stopLeg"],
      });
    }
  });

export type PlaybookRule = z.infer<typeof PlaybookRuleSchema>;

export const PlaybookTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  rules: z.array(PlaybookRuleSchema).min(1),
});

export type PlaybookTemplate = z.infer<typeof PlaybookTemplateSchema>;

export const RuleRuntimeStatusSchema = z.enum([
  "pending",
  "armed",
  "fired",
  "skipped",
  "cancelled",
]);

export type RuleRuntimeStatus = z.infer<typeof RuleRuntimeStatusSchema>;

export const RuleRuntimeSchema = z.object({
  ruleId: z.string().min(1),
  status: RuleRuntimeStatusSchema,
  firedAt: z.string().datetime().optional(),
  skippedReason: z.string().optional(),
});

export type RuleRuntime = z.infer<typeof RuleRuntimeSchema>;

export const PlaybookInstanceStatusSchema = z.enum([
  "pending_fill",
  "armed",
  "paused",
  "completed",
  "detached",
]);

export type PlaybookInstanceStatus = z.infer<typeof PlaybookInstanceStatusSchema>;

export const PlaybookInstanceSchema = z.object({
  id: z.string().min(1),
  templateId: z.string().min(1),
  /** Frozen recipe at attach — survives user template edits/deletes. */
  templateSnapshot: PlaybookTemplateSchema.optional(),
  positionPlan: PositionPlanSchema,
  status: PlaybookInstanceStatusSchema,
  ruleRuntimes: z.array(RuleRuntimeSchema),
  orderIntentId: z.string().min(1).optional(),
  orderRef: z.string().min(1).optional(),
  /** Cached protective stop order id after reconcile (Phase 2 manager). */
  stopOrderId: z.number().int().positive().nullable().optional(),
  /** Filled entry qty observed at arm time — basis for scale-out fractions. */
  filledQty: z.number().positive().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PlaybookInstance = z.infer<typeof PlaybookInstanceSchema>;

export function createPlaybookInstance(args: {
  id: string;
  template: PlaybookTemplate;
  positionPlan: PositionPlan;
  status?: PlaybookInstanceStatus;
  orderIntentId?: string;
  orderRef?: string;
  createdAt?: string;
}): PlaybookInstance {
  const now = args.createdAt ?? new Date().toISOString();
  return PlaybookInstanceSchema.parse({
    id: args.id,
    templateId: args.template.id,
    templateSnapshot: args.template,
    positionPlan: args.positionPlan,
    status: args.status ?? "pending_fill",
    ruleRuntimes: args.template.rules.map((rule) => ({
      ruleId: rule.id,
      status: "pending" as const,
    })),
    orderIntentId: args.orderIntentId,
    orderRef: args.orderRef,
    createdAt: now,
    updatedAt: now,
  });
}

/** Pure planner output — intended manage steps derived from locked R (no broker I/O). */
export const ManageStepSchema = z.object({
  ruleId: z.string().min(1),
  label: z.string().min(1),
  when: PlaybookWhenSchema,
  then: PlaybookThenSchema,
  triggerPrice: z.number().positive().optional(),
  reduceQty: z.number().positive().optional(),
  stopPrice: z.number().positive().optional(),
});

export type ManageStep = z.infer<typeof ManageStepSchema>;
