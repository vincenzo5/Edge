import { z } from "zod";

import { BrokerageContractSchema } from "@/lib/marketData/contracts/brokerage";
import { JOURNAL_SETUP_VALUES } from "@/lib/journal/types";

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

export type JournalFillInput = z.infer<typeof journalFillInputSchema>;
export type JournalFillResponse = z.infer<typeof journalFillResponseSchema>;
export type JournalTradeResponse = z.infer<typeof journalTradeResponseSchema>;
export type JournalTradePatch = z.infer<typeof journalTradePatchSchema>;
