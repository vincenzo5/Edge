import { z } from "zod";

import { BracketStopLegSchema } from "@/lib/trading/types";

export { EntryOrderSchema, type EntryOrder } from "@/lib/trading/orderExecutionRecipe";

export const RiskPolicySchemaVersionSchema = z.literal(1);
export type RiskPolicySchemaVersion = z.infer<typeof RiskPolicySchemaVersionSchema>;

export const RiskPolicyScopeSchema = z.enum(["trade"]);
export type RiskPolicyScope = z.infer<typeof RiskPolicyScopeSchema>;

export const InheritsSlotSchema = z.object({ kind: z.literal("inherits") });
export type InheritsSlot = z.infer<typeof InheritsSlotSchema>;

export const BudgetSlotSchema = z.object({
  kind: z.enum(["dollar", "percentNetLiq"]),
  value: z.number().positive(),
});
export type BudgetSlot = z.infer<typeof BudgetSlotSchema>;

export const BudgetSlotOrInheritsSchema = z.union([BudgetSlotSchema, InheritsSlotSchema]);
export type BudgetSlotOrInherits = z.infer<typeof BudgetSlotOrInheritsSchema>;


export const SizingSlotSchema = z.object({
  method: z.literal("stopDistance"),
  maxQty: z.number().positive().optional(),
});
export type SizingSlot = z.infer<typeof SizingSlotSchema>;

export const SizingSlotOrInheritsSchema = z.union([SizingSlotSchema, InheritsSlotSchema]);

export const GeometryStopRecipeSchema = z.object({
  rMultiple: z.number().positive().optional(),
  price: z.number().positive().optional(),
});

export const GeometryTargetRecipeSchema = z.object({
  rMultiple: z.number().positive().optional(),
  price: z.number().positive().optional(),
});

export const GeometryRecipeSchema = z.object({
  stops: z.array(GeometryStopRecipeSchema).min(1).optional(),
  targets: z.array(GeometryTargetRecipeSchema).optional(),
  timeHorizonBars: z.number().int().positive().optional(),
});
export type GeometryRecipe = z.infer<typeof GeometryRecipeSchema>;

export const PolicyGatesSchema = z.object({
  minRiskReward: z.number().positive().optional(),
  maxQty: z.number().positive().optional(),
});
export type PolicyGates = z.infer<typeof PolicyGatesSchema>;

export const ExitRuleRoleSchema = z.enum([
  "protect",
  "takeProfit",
  "manage",
  "flatten",
  "hedge",
]);
export type ExitRuleRole = z.infer<typeof ExitRuleRoleSchema>;

export const ExitRuleBindingSchema = z.enum([
  "restingBroker",
  "managedApp",
  "discretionary",
  "notifyOnly",
]);
export type ExitRuleBinding = z.infer<typeof ExitRuleBindingSchema>;

export const ExitRuleQtyScopeSchema = z.enum(["full", "fraction", "remainder", "fixedQty"]);
export type ExitRuleQtyScope = z.infer<typeof ExitRuleQtyScopeSchema>;

export const EntryScheduleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("immediate") }),
  z.object({
    kind: z.literal("sessionEvent"),
    event: z.enum(["nextRthOpen", "nextRthClose"]),
  }),
  z.object({
    kind: z.literal("clock"),
    at: z.string().datetime(),
    timeZone: z.string().min(1),
  }),
]);
export type EntrySchedule = z.infer<typeof EntryScheduleSchema>;

export const PolicyBindingRefKindSchema = z.enum(["drawing", "ticket", "position"]);
export type PolicyBindingRefKind = z.infer<typeof PolicyBindingRefKindSchema>;

export const PolicyBindingRefSchema = z.object({
  kind: PolicyBindingRefKindSchema,
  id: z.string().min(1),
});
export type PolicyBindingRef = z.infer<typeof PolicyBindingRefSchema>;

export const RiskPolicyControlModeSchema = z.enum(["automated", "paused", "manual", "off"]);
export type RiskPolicyControlMode = z.infer<typeof RiskPolicyControlModeSchema>;

export const RiskPolicyOffReasonSchema = z.enum([
  "manual",
  "manual_stop_drag",
  "gate_breach",
  "swapped",
  "template_missing",
  "exit_cleanup",
  "position_flat",
  "env_kill",
  "rule_flatten",
  "manual_flatten",
]);
export type RiskPolicyOffReason = z.infer<typeof RiskPolicyOffReasonSchema>;

export const ProtectStateSchema = z.enum([
  "unknown",
  "resting",
  "partial",
  "missing",
  "cancelled",
]);
export type ProtectState = z.infer<typeof ProtectStateSchema>;

export const ProtectExpectedKindSchema = z.enum(["stop", "takeProfit", "trail"]);
export type ProtectExpectedKind = z.infer<typeof ProtectExpectedKindSchema>;

export const ProtectExpectedSchema = z.object({
  kind: ProtectExpectedKindSchema,
  stopLeg: BracketStopLegSchema.optional(),
  price: z.number().positive().optional(),
  qtyScope: ExitRuleQtyScopeSchema.optional(),
});
export type ProtectExpected = z.infer<typeof ProtectExpectedSchema>;

export const ProtectObservedSchema = z.object({
  orderId: z.number().int().positive().optional(),
  ocaGroup: z.string().min(1).optional(),
  orderRef: z.string().min(1).optional(),
  seenAt: z.string().datetime().optional(),
});
export type ProtectObserved = z.infer<typeof ProtectObservedSchema>;

export const ProtectBindingSchema = z.object({
  exitId: z.string().min(1),
  role: ExitRuleRoleSchema,
  expected: ProtectExpectedSchema,
  observed: ProtectObservedSchema.nullable().default(null),
});
export type ProtectBinding = z.infer<typeof ProtectBindingSchema>;
