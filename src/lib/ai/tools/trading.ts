import { z } from "zod";
import { defineTool } from "../types";
import type { ToolContext } from "../context";
import {
  AttachManagementPlaybookRequestSchema,
  OrderDraftSchema,
  OrderSideSchema,
  OrderTypeSchema,
  PreviewPlaybookRequestSchema,
  TimeInForceSchema,
  TradingEnvironmentSchema,
} from "@/lib/trading/types";
import { resolveTradingAccountId } from "@/lib/trading/activeAccount";
import { ComposeRiskPolicyViewInputSchema, composeRiskPolicyView } from "@/lib/risk/composeRiskPolicyView";

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

const previewPlaybookInputSchema = PreviewPlaybookRequestSchema.extend({
  accountId: z.string().min(1).optional(),
});

const attachPlaybookInputSchema = AttachManagementPlaybookRequestSchema.extend({
  accountId: z.string().min(1).optional(),
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

export const previewRiskPolicyTool = defineTool({
  name: "preview_risk_policy",
  description:
    "Preview a slot-complete RiskPolicy view from Plan (Budget, Sizing, Geometry), Protect (resting broker exits), and Manage (playbook preset) inputs. Returns Budget, Sizing, Geometry, Exits, Gates, and Measurement summaries — view only, does not place orders or attach playbooks. Pair with get_risk_settings for session Budget when dollarRisk is omitted.",
  inputSchema: ComposeRiskPolicyViewInputSchema,
  permission: "read",
  requiresConfirmation: false,
  requiresClientSession: false,
  async execute(input, context) {
    const dollarRisk =
      input.dollarRisk ??
      (context.risk ? context.risk.getRiskSettings().dollarRisk : null) ??
      undefined;
    const view = composeRiskPolicyView({
      ...input,
      dollarRisk,
    });
    return {
      ok: true,
      data: view,
    };
  },
});

export const previewOrderTool = defineTool({
  name: "preview_order",
  description:
    "Preview a stock order what-if (commission, margin impact, warnings). Does not place the order. For RiskPolicy slot summary (Budget, Sizing, Geometry, Protect, Manage), use preview_risk_policy. Set environment to live for live Gateway preview.",
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
        orderRef: result.order.orderRef,
        status: result.order.status ?? null,
        intentId: result.intent.intentId,
      },
    };
  },
});

export const previewPlaybookTool = defineTool({
  name: "preview_playbook",
  description:
    "Preview a Manage playbook template against locked Geometry (entry/stop). Returns planned manage ExitRules (break-even, scale, trail) without attaching or mutating broker orders. For a full RiskPolicy slot summary including Budget, Sizing, and Protect, use preview_risk_policy.",
  inputSchema: previewPlaybookInputSchema,
  permission: "write",
  requiresConfirmation: false,
  requiresClientSession: false,
  async execute(input, context) {
    const trading = requireTrading(context);
    const accountId = await resolveAccountId(context, input.accountId);
    const preview = await trading.previewPlaybook({
      templateId: input.templateId,
      accountId,
      symbol: input.symbol,
      side: input.side,
      entry: input.entry,
      initialStop: input.initialStop,
      qty: input.qty,
      environment: input.environment ?? "paper",
    });
    return {
      ok: true,
      data: preview,
    };
  },
});

export const attachPlaybookTool = defineTool({
  name: "attach_playbook",
  description:
    "Attach a management playbook to a position plan. Requires explicit user confirmation. Live attach requires liveConfirmation: LIVE. Use preview_playbook first to show planned steps.",
  inputSchema: attachPlaybookInputSchema,
  permission: "destructive",
  requiresConfirmation: true,
  requiresClientSession: false,
  async execute(input, context) {
    const trading = requireTrading(context);
    const accountId = await resolveAccountId(context, input.accountId);
    const instance = await trading.attachPlaybook({
      ...input,
      accountId,
      environment: input.environment ?? "paper",
    });
    return {
      ok: true,
      data: {
        instanceId: instance.id,
        templateId: instance.templateId,
        status: instance.status,
        orderRef: instance.orderRef ?? null,
        orderIntentId: instance.orderIntentId ?? null,
      },
    };
  },
});

export const tradingTools = [
  previewRiskPolicyTool,
  previewOrderTool,
  placeOrderTool,
  previewPlaybookTool,
  attachPlaybookTool,
];
