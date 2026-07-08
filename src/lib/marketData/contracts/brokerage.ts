import { z } from "zod";

export const BrokerageContractSchema = z.object({
  conId: z.number().nullable().optional(),
  symbol: z.string().nullable().optional(),
  secType: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  exchange: z.string().nullable().optional(),
  primaryExchange: z.string().nullable().optional(),
  lastTradeDateOrContractMonth: z.string().nullable().optional(),
  strike: z.number().nullable().optional(),
  right: z.string().nullable().optional(),
  multiplier: z.string().nullable().optional(),
  localSymbol: z.string().nullable().optional(),
});

export type BrokerageContract = z.infer<typeof BrokerageContractSchema>;

export const AccountSummaryTagSchema = z.object({
  tag: z.string(),
  value: z.string(),
  currency: z.string().optional(),
  account: z.string().optional(),
});

export type AccountSummaryTag = z.infer<typeof AccountSummaryTagSchema>;

export const AccountPnLSchema = z.object({
  account: z.string().nullable().optional(),
  dailyPnL: z.number().nullable().optional(),
  unrealizedPnL: z.number().nullable().optional(),
  realizedPnL: z.number().nullable().optional(),
  updatedAt: z.number().optional(),
});

export type AccountPnL = z.infer<typeof AccountPnLSchema>;

export const AccountSummarySchema = z.object({
  accountId: z.string().nullable().optional(),
  tags: z.record(z.string(), AccountSummaryTagSchema),
  pnl: AccountPnLSchema.optional(),
  updatedAt: z.number(),
});

export type AccountSummary = z.infer<typeof AccountSummarySchema>;

export const AccountPositionSchema = z.object({
  account: z.string().nullable().optional(),
  contract: BrokerageContractSchema,
  position: z.number().nullable().optional(),
  avgCost: z.number().nullable().optional(),
  marketPrice: z.number().nullable().optional(),
  marketValue: z.number().nullable().optional(),
  unrealizedPNL: z.number().nullable().optional(),
  realizedPNL: z.number().nullable().optional(),
  updatedAt: z.number().optional(),
});

export type AccountPosition = z.infer<typeof AccountPositionSchema>;

export const AccountOrderSchema = z.object({
  orderId: z.number().nullable().optional(),
  permId: z.number().nullable().optional(),
  clientId: z.number().nullable().optional(),
  account: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
  totalQuantity: z.number().nullable().optional(),
  orderType: z.string().nullable().optional(),
  lmtPrice: z.number().nullable().optional(),
  auxPrice: z.number().nullable().optional(),
  tif: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  filled: z.number().nullable().optional(),
  remaining: z.number().nullable().optional(),
  avgFillPrice: z.number().nullable().optional(),
  lastFillPrice: z.number().nullable().optional(),
  whyHeld: z.string().nullable().optional(),
  symbol: z.string().nullable().optional(),
  secType: z.string().nullable().optional(),
  conId: z.number().nullable().optional(),
  updatedAt: z.number().optional(),
});

export type AccountOrder = z.infer<typeof AccountOrderSchema>;

export const AccountExecutionSchema = z.object({
  execId: z.string().nullable().optional(),
  time: z.string().nullable().optional(),
  account: z.string().nullable().optional(),
  side: z.string().nullable().optional(),
  shares: z.number().nullable().optional(),
  price: z.number().nullable().optional(),
  cumQty: z.number().nullable().optional(),
  avgPrice: z.number().nullable().optional(),
  orderId: z.number().nullable().optional(),
  permId: z.number().nullable().optional(),
  orderRef: z.string().nullable().optional(),
  exchange: z.string().nullable().optional(),
  /** @deprecated Prefer contract.symbol — kept for backward compatibility with cached payloads */
  symbol: z.string().nullable().optional(),
  /** @deprecated Prefer contract.secType */
  secType: z.string().nullable().optional(),
  contract: BrokerageContractSchema.optional(),
  commission: z.number().nullable().optional(),
  commissionCurrency: z.string().nullable().optional(),
  realizedPNL: z.number().nullable().optional(),
  updatedAt: z.number().optional(),
});

export type AccountExecution = z.infer<typeof AccountExecutionSchema>;

/** Human-readable label for a fill row (supports OPT contracts). */
export function formatExecutionLabel(fill: AccountExecution): string {
  const contract = fill.contract;
  const secType = contract?.secType ?? fill.secType;
  const symbol =
    (secType === "OPT" && contract?.localSymbol?.trim()) ||
    contract?.symbol ||
    fill.symbol ||
    "—";
  const side = fill.side ?? "—";
  const qty = fill.shares ?? "—";
  const price = fill.price ?? "—";
  if (secType === "OPT" && contract?.strike != null && contract.right) {
    const expiry = contract.lastTradeDateOrContractMonth ?? "";
    const expirySuffix = expiry ? ` ${expiry}` : "";
    return `${symbol} · ${contract.strike}${contract.right}${expirySuffix} · ${side} ${qty} @ ${price}`;
  }
  return `${symbol} · ${side} ${qty} @ ${price}`;
}

export const WhatIfRequestSchema = z.object({
  symbol: z.string().min(1),
  action: z.enum(["BUY", "SELL"]),
  quantity: z.number().positive(),
  orderType: z.enum(["LMT", "MKT"]).default("LMT"),
  limitPrice: z.number().positive().optional(),
});

export type WhatIfRequest = z.infer<typeof WhatIfRequestSchema>;

export const WhatIfResultSchema = z.object({
  symbol: z.string(),
  action: z.enum(["BUY", "SELL"]),
  quantity: z.number(),
  orderType: z.enum(["LMT", "MKT"]),
  limitPrice: z.number().nullable().optional(),
  initMarginChange: z.number().nullable().optional(),
  maintMarginChange: z.number().nullable().optional(),
  equityWithLoanChange: z.number().nullable().optional(),
  commission: z.number().nullable().optional(),
  minCommission: z.number().nullable().optional(),
  maxCommission: z.number().nullable().optional(),
  warningText: z.string().nullable().optional(),
  updatedAt: z.number(),
});

export type WhatIfResult = z.infer<typeof WhatIfResultSchema>;

export const AccountStatusSchema = z.object({
  enabled: z.boolean(),
  connected: z.boolean(),
  accountId: z.string().nullable().optional(),
  managedAccounts: z.array(z.string()),
  summaryUpdatedAt: z.number().nullable().optional(),
  readOnly: z.boolean().optional(),
  timestamp: z.number(),
});

export type AccountStatus = z.infer<typeof AccountStatusSchema>;

export const AccountStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("snapshot"),
    status: AccountStatusSchema.optional(),
    summary: AccountSummarySchema.optional(),
    positions: z.array(AccountPositionSchema).optional(),
    pnl: AccountPnLSchema.optional(),
    orders: z.array(AccountOrderSchema).optional(),
    executions: z.array(AccountExecutionSchema).optional(),
    meta: z
      .object({
        source: z.string().optional(),
        asOf: z.number().optional(),
        streaming: z.boolean().optional(),
      })
      .optional(),
  }),
  z.object({
    type: z.literal("update"),
    status: AccountStatusSchema.optional(),
    summary: AccountSummarySchema.optional(),
    positions: z.array(AccountPositionSchema).optional(),
    pnl: AccountPnLSchema.optional(),
    orders: z.array(AccountOrderSchema).optional(),
    executions: z.array(AccountExecutionSchema).optional(),
    meta: z
      .object({
        source: z.string().optional(),
        asOf: z.number().optional(),
        streaming: z.boolean().optional(),
      })
      .optional(),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
    recoverable: z.boolean().optional(),
  }),
]);

export type AccountStreamEvent = z.infer<typeof AccountStreamEventSchema>;

/** Parse numeric account summary tag value. */
export function parseSummaryTagNumber(
  tags: Record<string, AccountSummaryTag>,
  tag: string,
): number | null {
  const raw = tags[tag]?.value;
  if (raw == null || raw === "") return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}
