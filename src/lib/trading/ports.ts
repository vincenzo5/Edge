import type { AccountOrder } from "@/lib/marketData/contracts/brokerage";
import type { OrderDraft, OrderModifyPatch, OrderPreview, TradingAccount } from "./types";

export type BrokerTradingPort = {
  listAccounts(): Promise<TradingAccount[]>;
  preview(draft: OrderDraft): Promise<OrderPreview>;
  place(draft: OrderDraft): Promise<{ order: AccountOrder; orderRef: string }>;
  modify(
    accountId: string,
    orderId: number,
    patch: OrderModifyPatch,
  ): Promise<{ order: AccountOrder }>;
  cancel(accountId: string, orderId: number): Promise<{ order: AccountOrder }>;
  listOpenOrders(accountId?: string): Promise<AccountOrder[]>;
};
