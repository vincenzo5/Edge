import { z } from "zod";

import { BrokerageContractSchema } from "@/lib/marketData/contracts/brokerage";
import { JOURNAL_SETUP_VALUES } from "@/lib/journal/types";
import { cellConfigSchema } from "@/lib/persistence/schemas/chartWorkspace";
import { RuleRuntimeSchema } from "@/lib/trading/playbook/types";

export const journalFillSourceSchema = z.enum(["live", "flex_csv", "flex_api"]);

export const journalFillInputSchema = z.object({
  execId: z.string().trim().min(1).max(128),
  account: z.string().trim().max(64).nullable().optional(),
  fillTime: z.string().datetime({ offset: true }),
  side: z.string().trim().min(1).max(16),
  quantity: z.number().finite().positive(),
  price: z.number().finite(),
  avgPrice: z.number().finite().nullable().optional(),
  orderId: z.number().int().nullable().optional(),
  permId: z.number().int().nullable().optional(),
  orderRef: z.string().trim().max(128).nullable().optional(),
  exchange: z.string().trim().max(32).nullable().optional(),
  contract: BrokerageContractSchema,
  commission: z.number().finite().nullable().optional(),
  commissionCurrency: z.string().trim().max(8).nullable().optional(),
  realizedPNL: z.number().finite().nullable().optional(),
  source: journalFillSourceSchema.default("live"),
});

export const journalFillBatchSchema = z.object({
  fills: z.array(journalFillInputSchema).max(5000),
  rebuildTrades: z.boolean().default(true),
});

export const journalFillResponseSchema = journalFillInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime({ offset: true }),
});

export const journalTradeLegSchema = z.object({
  conId: z.number().nullable().optional(),
  symbol: z.string().nullable().optional(),
  secType: z.string().nullable().optional(),
  strike: z.number().nullable().optional(),
  right: z.string().nullable().optional(),
  expiry: z.string().nullable().optional(),
  localSymbol: z.string().nullable().optional(),
  multiplier: z.string().nullable().optional(),
  netQuantity: z.number().nullable().optional(),
});

export const managePlaybookPositionPlanSchema = z.object({
  entry: z.number().positive(),
  initialStop: z.number().positive(),
  qty: z.number().positive(),
  rUnit: z.number().positive(),
  side: z.enum(["BUY", "SELL"]),
});

export type ManagePlaybookPositionPlan = z.infer<typeof managePlaybookPositionPlanSchema>;

export const managePlaybookJournalSchema = z.object({
  templateId: z.string().min(1),
  templateName: z.string().min(1),
  instanceId: z.string().min(1),
  ruleTimeline: z.array(RuleRuntimeSchema),
  plannedRuleCount: z.number().int().nonnegative(),
  firedRuleCount: z.number().int().nonnegative(),
  positionPlan: managePlaybookPositionPlanSchema.optional(),
  protectSummary: z.string().min(1).optional(),
});

export type ManagePlaybookJournal = z.infer<typeof managePlaybookJournalSchema>;

export const journalTradeResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "closed"]),
  direction: z.enum(["long", "short"]),
  symbol: z.string(),
  secType: z.string(),
  openedAt: z.string().datetime({ offset: true }),
  closedAt: z.string().datetime({ offset: true }).nullable().optional(),
  netQuantity: z.number().nullable().optional(),
  avgEntry: z.number().nullable().optional(),
  avgExit: z.number().nullable().optional(),
  grossPnL: z.number().nullable().optional(),
  netPnL: z.number().nullable().optional(),
  totalCommission: z.number().nullable().optional(),
  legs: z.array(journalTradeLegSchema).optional(),
  fillExecIds: z.array(z.string()),
  tags: z.array(z.string()).optional(),
  setup: z.enum(JOURNAL_SETUP_VALUES as [string, ...string[]]).nullable().optional(),
  reviewNote: z.string().max(10000).nullable().optional(),
  plannedRiskMode: z.enum(["usd", "pct"]).nullable().optional(),
  plannedRiskValue: z.number().finite().positive().nullable().optional(),
  plannedRiskUsd: z.number().finite().positive().nullable().optional(),
  initialStop: z.number().finite().positive().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  ignored: z.boolean().optional(),
  mfeUsd: z.number().finite().nonnegative().nullable().optional(),
  mfaUsd: z.number().finite().nonnegative().nullable().optional(),
  excursionInterval: z.enum(["1m", "5m"]).nullable().optional(),
  excursionComputedAt: z.string().datetime({ offset: true }).nullable().optional(),
  managePlaybook: managePlaybookJournalSchema.nullable().optional(),
  riskPolicyInstanceId: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const journalTradePatchSchema = z
  .object({
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    setup: z.enum(JOURNAL_SETUP_VALUES as [string, ...string[]]).nullable().optional(),
    reviewNote: z.string().trim().max(10000).nullable().optional(),
    plannedRiskMode: z.enum(["usd", "pct"]).nullable().optional(),
    plannedRiskValue: z.number().finite().positive().nullable().optional(),
    initialStop: z.number().finite().positive().nullable().optional(),
    rating: z.number().int().min(1).max(5).nullable().optional(),
    ignored: z.boolean().optional(),
    mfeUsd: z.number().finite().nonnegative().nullable().optional(),
    mfaUsd: z.number().finite().nonnegative().nullable().optional(),
    excursionInterval: z.enum(["1m", "5m"]).nullable().optional(),
    excursionComputedAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const journalTradeListQuerySchema = z.object({
  status: z.enum(["open", "closed", "all"]).default("all"),
  symbol: z.string().trim().max(16).optional(),
  secType: z.string().trim().max(8).optional(),
  tag: z.string().trim().max(40).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export const journalFillAccountIndexQuerySchema = z.object({
  execIds: z.array(z.string().trim().min(1)).max(5000),
});

export const journalFillAccountIndexEntrySchema = z.object({
  execId: z.string(),
  account: z.string().nullable(),
});

export type JournalFillAccountIndexEntry = z.infer<typeof journalFillAccountIndexEntrySchema>;

export type JournalFillInput = z.infer<typeof journalFillInputSchema>;
export type JournalFillResponse = z.infer<typeof journalFillResponseSchema>;
export type JournalTradeResponse = z.infer<typeof journalTradeResponseSchema>;
export type JournalTradePatch = z.infer<typeof journalTradePatchSchema>;

export const journalScreenshotSourceSchema = z.enum(["upload", "paste", "chart_capture"]);

export const journalScreenshotResponseSchema = z.object({
  id: z.string().uuid(),
  tradeId: z.string().uuid(),
  sortIndex: z.number().int().nonnegative(),
  caption: z.string().max(500).nullable().optional(),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  byteSize: z.number().int().positive(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  source: journalScreenshotSourceSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const journalScreenshotPatchSchema = z
  .object({
    caption: z.string().trim().max(500).nullable().optional(),
    sortIndex: z.number().int().nonnegative().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export type JournalScreenshotResponse = z.infer<typeof journalScreenshotResponseSchema>;
export type JournalScreenshotPatch = z.infer<typeof journalScreenshotPatchSchema>;

export const journalTradePlanLevelsSchema = z.object({
  direction: z.enum(["long", "short"]),
  side: z.enum(["BUY", "SELL"]),
  entry: z.number().finite(),
  stop: z.number().finite(),
  target: z.number().finite(),
  riskRewardRatio: z.number().finite().nullable(),
});

export const journalChartSnapshotResponseSchema = z.object({
  id: z.string().uuid(),
  tradeId: z.string().uuid(),
  sortIndex: z.number().int().nonnegative(),
  label: z.string().max(120).nullable().optional(),
  symbol: z.string(),
  interval: z.string(),
  cellConfig: cellConfigSchema,
  planLevels: journalTradePlanLevelsSchema.nullable().optional(),
  screenshotId: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const journalChartSnapshotCreateSchema = z.object({
  cellConfig: cellConfigSchema,
  label: z.string().trim().max(120).nullable().optional(),
  planLevels: journalTradePlanLevelsSchema.nullable().optional(),
  screenshotId: z.string().uuid().nullable().optional(),
});

export const journalChartSnapshotPatchSchema = z
  .object({
    cellConfig: cellConfigSchema.optional(),
    label: z.string().trim().max(120).nullable().optional(),
    resetToOriginal: z.literal(true).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export type JournalChartSnapshotResponse = z.infer<typeof journalChartSnapshotResponseSchema>;
export type JournalChartSnapshotCreate = z.infer<typeof journalChartSnapshotCreateSchema>;
export type JournalChartSnapshotPatch = z.infer<typeof journalChartSnapshotPatchSchema>;
export type JournalTradePlanLevels = z.infer<typeof journalTradePlanLevelsSchema>;
