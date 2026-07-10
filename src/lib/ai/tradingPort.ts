import type {
  OrderDraft,
  PlacedOrderResult,
  SubmitOrderRequest,
  TradingAccount,
} from "@/lib/trading/types";
import {
  cancelOrder,
  fetchTradingAccounts,
  previewOrder,
  submitOrder,
} from "@/lib/trading/tradingClient";

export type TradingPort = {
  listAccounts: () => Promise<{
    accounts: TradingAccount[];
    defaultAccountId: string;
  }>;
  previewOrder: (
    draft: OrderDraft,
  ) => Promise<{ preview: Awaited<ReturnType<typeof previewOrder>>["preview"]; intent: Awaited<ReturnType<typeof previewOrder>>["intent"] }>;
  submitOrder: (request: SubmitOrderRequest) => Promise<PlacedOrderResult>;
  cancelOrder: (
    orderId: number,
    accountId: string,
    intentId?: string,
  ) => Promise<{ order: unknown; intent?: PlacedOrderResult["intent"] | null }>;
};

export function createFetchTradingPort(baseUrl = ""): TradingPort {
  return {
    listAccounts: () => fetchTradingAccounts(undefined, baseUrl),
    previewOrder: (draft) => previewOrder(draft, baseUrl),
    submitOrder: (request) => submitOrder(request, baseUrl),
    cancelOrder: (orderId, accountId, intentId) =>
      cancelOrder(orderId, accountId, { intentId }, baseUrl),
  };
}

export function createServiceTradingPort(
  service: {
    listAccounts: () => Promise<TradingAccount[]>;
    previewOrder: (draft: OrderDraft) => ReturnType<TradingPort["previewOrder"]>;
    submitOrder: (
      draft: OrderDraft,
      idempotencyKey: string,
      previewIntentId?: string,
      liveConfirmation?: string,
    ) => Promise<PlacedOrderResult>;
    cancelOrder: (
      accountId: string,
      orderId: number,
      intentId?: string,
      environment?: OrderDraft["environment"],
      liveConfirmation?: string,
    ) => Promise<{ order: unknown; intent?: PlacedOrderResult["intent"] | null }>;
    resolveDefaultAccountId: (accounts: TradingAccount[]) => string;
  },
): TradingPort {
  return {
    async listAccounts() {
      const accounts = await service.listAccounts();
      return {
        accounts,
        defaultAccountId: service.resolveDefaultAccountId(accounts),
      };
    },
    previewOrder: (draft) => service.previewOrder(draft),
    submitOrder: (request) =>
      service.submitOrder(
        request.draft,
        request.idempotencyKey,
        request.previewIntentId,
        request.liveConfirmation,
      ),
    cancelOrder: (orderId, accountId, intentId) =>
      service.cancelOrder(accountId, orderId, intentId, "paper", undefined),
  };
}
