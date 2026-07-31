import { z } from "zod";

import {
  EntryOrderSchema,
  EntryScheduleSchema,
  PolicyBindingRefSchema,
} from "@/lib/risk/policy/slotSchemas";
import { PositionPlanSchema } from "@/lib/trading/playbook/types";

export const ApplyRiskPolicyRequestSchema = z.object({
  templateId: z.string().min(1),
  positionPlan: PositionPlanSchema,
  bindingRef: PolicyBindingRefSchema,
  onConflict: z.enum(["reject", "swap"]).optional(),
  entrySchedule: EntryScheduleSchema.optional(),
  entryOrder: EntryOrderSchema.optional(),
  scheduledFor: z.string().datetime().optional(),
});

export type ApplyRiskPolicyRequest = z.infer<typeof ApplyRiskPolicyRequestSchema>;

export const SyncPlannedInstanceRequestSchema = z
  .object({
    positionPlan: PositionPlanSchema.optional(),
    entryOrder: EntryOrderSchema.optional(),
    entrySchedule: EntryScheduleSchema.optional(),
    scheduledFor: z.string().datetime().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export type SyncPlannedInstanceRequest = z.infer<typeof SyncPlannedInstanceRequestSchema>;

export const PromotePlannedInstanceRequestSchema = z.object({
  idempotencyKey: z.string().min(1),
  previewIntentId: z.string().min(1).optional(),
  liveConfirmation: z.string().optional(),
  unprotectedConfirm: z.boolean().optional(),
  takeProfitPrice: z.number().positive().optional(),
});

export type PromotePlannedInstanceRequest = z.infer<typeof PromotePlannedInstanceRequestSchema>;

export const ArmPlannedScheduleRequestSchema = z.object({
  entrySchedule: EntryScheduleSchema,
  scheduledFor: z.string().datetime().optional(),
});

export type ArmPlannedScheduleRequest = z.infer<typeof ArmPlannedScheduleRequestSchema>;

export const ClearPlannedBindingRequestSchema = z.object({
  bindingRef: PolicyBindingRefSchema,
});

export type ClearPlannedBindingRequest = z.infer<typeof ClearPlannedBindingRequestSchema>;
