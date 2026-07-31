import { z } from "zod";

import {
  OrderSideSchema,
  TradingEnvironmentSchema,
} from "@/lib/trading/types";
import {
  PlaybookRuleSchema,
  PositionPlanSchema,
  RuleRuntimeSchema,
} from "@/lib/trading/playbook/types";
import { BracketStopLegSchema } from "@/lib/trading/types";

import {
  BudgetSlotOrInheritsSchema,
  EntryOrderSchema,
  EntryScheduleSchema,
  ExitRuleBindingSchema,
  ExitRuleQtyScopeSchema,
  ExitRuleRoleSchema,
  GeometryRecipeSchema,
  PolicyBindingRefSchema,
  PolicyGatesSchema,
  ProtectStateSchema,
  RiskPolicyControlModeSchema,
  RiskPolicyOffReasonSchema,
  RiskPolicySchemaVersionSchema,
  RiskPolicyScopeSchema,
  SizingSlotOrInheritsSchema,
  type EntryOrder,
  type EntrySchedule,
} from "./slotSchemas";

/** Re-export for policy consumers — geometry lock lives in playbook types. */
export { PositionPlanSchema, type PositionPlan } from "@/lib/trading/playbook/types";
export * from "./slotSchemas";

/** Exit rules share PlaybookRule shape with optional role/binding metadata (M1). */
export const ExitRuleSchema = PlaybookRuleSchema;
export type ExitRule = z.infer<typeof ExitRuleSchema>;

export const RiskPolicyTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  schemaVersion: RiskPolicySchemaVersionSchema.default(1),
  scope: RiskPolicyScopeSchema.default("trade"),
  budget: BudgetSlotOrInheritsSchema.optional(),
  sizing: SizingSlotOrInheritsSchema.optional(),
  geometry: GeometryRecipeSchema.optional(),
  exits: z.array(ExitRuleSchema).min(1),
  gates: PolicyGatesSchema.optional(),
  /** v1 always empty — present for forward compatibility. */
  adds: z.array(z.never()).default([]),
  /** Optional default copied to instance on apply. */
  defaultEntrySchedule: EntryScheduleSchema.optional(),
});
export type RiskPolicyTemplate = z.infer<typeof RiskPolicyTemplateSchema>;

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

export const RiskPolicyInstanceStatusSchema = z.enum([
  "planned",
  "pending_fill",
  "armed",
  "paused",
  "completed",
  "closed",
  "detached",
  "superseded",
]);
export type RiskPolicyInstanceStatus = z.infer<typeof RiskPolicyInstanceStatusSchema>;

export const ExitRuntimeSchema = RuleRuntimeSchema;
export type ExitRuntime = z.infer<typeof ExitRuntimeSchema>;
export { RuleRuntimeStatusSchema, type RuleRuntimeStatus } from "@/lib/trading/playbook/types";

export const RiskPolicyInstanceSchema = z.object({
  id: z.string().min(1),
  templateId: z.string().min(1),
  policySnapshot: RiskPolicyTemplateSchema,
  bindingRef: PolicyBindingRefSchema,
  environment: TradingEnvironmentSchema,
  accountId: z.string().min(1),
  symbol: z.string().min(1),
  side: OrderSideSchema,
  positionPlan: PositionPlanSchema,
  entrySchedule: EntryScheduleSchema,
  entryOrder: EntryOrderSchema,
  status: RiskPolicyInstanceStatusSchema,
  controlMode: RiskPolicyControlModeSchema,
  offReason: RiskPolicyOffReasonSchema.optional(),
  exitRuntimes: z.array(ExitRuntimeSchema),
  protect: z.array(ProtectBindingSchema).default([]),
  protectState: ProtectStateSchema.default("unknown"),
  protectCheckedAt: z.string().datetime().optional(),
  orderIntentId: z.string().min(1).optional(),
  orderRef: z.string().min(1).optional(),
  stopOrderId: z.number().int().positive().nullable().optional(),
  filledQty: z.number().positive().nullable().optional(),
  alertBundleId: z.string().uuid().optional(),
  scheduledFor: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type RiskPolicyInstance = z.infer<typeof RiskPolicyInstanceSchema>;

/** Resolve exits from template — prefer exits column; fall back to rules at read time. */
export function resolveTemplateExits(template: RiskPolicyTemplate): ExitRule[] {
  return template.exits;
}

export function hasInheritsSlot(
  slot: z.infer<typeof BudgetSlotOrInheritsSchema> | z.infer<typeof SizingSlotOrInheritsSchema> | undefined,
): slot is { kind: "inherits" } {
  return slot?.kind === "inherits";
}

export function isRestingBrokerProtectExit(rule: ExitRule): boolean {
  return rule.role === "protect" && (rule.binding ?? "managedApp") === "restingBroker";
}

export function defaultEntrySchedule(): EntrySchedule {
  return { kind: "immediate" };
}

export function defaultEntryOrder(): EntryOrder {
  return { type: "LMT" };
}
