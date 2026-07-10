import { z } from "zod";
import { defineTool } from "../types";
import type { ToolContext } from "../context";
import {
  OrderDraftSchema,
  OrderSideSchema,
  OrderTypeSchema,
  TimeInForceSchema,
  TradingEnvironmentSchema,
} from "@/lib/trading/types";
import { resolveTradingAccountId } from "@/lib/trading/activeAccount";

const previewOrderInputSchema = z.object({
  accountId: z.string().min(1).optional(),
  symbol: z.string().min(1),
  side: OrderSideSchema,
  quantity: z.number().positive(),
  orderType: OrderTypeSchema.default("MKT"),
  limitPrice: z.number().positive().optional(),
  stopPrice: z.number().positive().optional(),
  outsideRth: z.boolean().default(false),
  tif: TimeInForceSchema.default("DAY"),
  orderRef: z.string().optional(),
  environment: TradingEnvironmentSchema.default("paper"),
});

const placeOrderInputSchema = z.object({
  draft: OrderDraftSchema,
  idempotencyKey: z.string().min(1),
  previewIntentId: z.string().min(1),
  liveConfirmation: z.string().optional(),
});

function requireTrading(context: ToolContext) {
  if (!context.trading) {
    throw new Error("Trading port unavailable");
  }
  return context.trading;
}

async function resolveAccountId(
  context: ToolContext,
  accountId?: string,
): Promise<string> {
  const trading = requireTrading(context);
  const { accounts, defaultAccountId } = await trading.listAccounts();
  return resolveTradingAccountId(accounts, accountId ?? defaultAccountId);
}

export const previewOrderTool = defineTool({
  name: "preview_order",
  description:
    "Preview a stock order what-if (commission, margin impact, warnings). Does not place the order. Set environment to live for live Gateway preview.",
  inputSchema: previewOrderInputSchema,
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: false,
  async execute(input, context) {
    const trading = requireTrading(context);
    const accountId = await resolveAccountId(context, input.accountId);
    const draft = OrderDraftSchema.parse({
      ...input,
      accountId,
      environment: input.environment ?? "paper",
    });
    const result = await trading.previewOrder(draft);
    return {
      ok: true,
      data: {
        preview: result.preview,
        intentId: result.intent.intentId,
        orderRef: result.intent.orderRef,
        warnings: result.preview.warnings,
      },
    };
  },
});

export const placeOrderTool = defineTool({
  name: "place_order",
  description:
    "Submit a stock order after preview_order. Requires previewIntentId from a fresh preview and explicit user confirmation. Live orders require liveConfirmation: LIVE.",
  inputSchema: placeOrderInputSchema,
  permission: "destructive",
  requiresConfirmation: true,
  requiresClientSession: false,
  async execute(input, context) {
    const trading = requireTrading(context);
    const accountId = await resolveAccountId(context, input.draft.accountId);
    const draft = OrderDraftSchema.parse({
      ...input.draft,
      accountId,
      environment: input.draft.environment ?? "paper",
    });
    const result = await trading.submitOrder({
      draft,
      idempotencyKey: input.idempotencyKey,
      previewIntentId: input.previewIntentId,
      liveConfirmation: input.liveConfirmation,
    });
    return {
      ok: true,
      data: {
        orderId: result.order.orderId ?? null,
        permId: result.order.permId ?? null,
        orderRef: result.orderRef,
        status: result.order.status ?? null,
        intentId: result.intent.intentId,
      },
    };
  },
});

export const tradingTools = [previewOrderTool, placeOrderTool];
