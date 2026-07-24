import type { AccountPosition } from "@/lib/marketData/contracts/brokerage";
import type { OrderDraft, TradingAccount } from "./types";

export type ClosePositionDraftInput = {
  position: AccountPosition;
  account: Pick<TradingAccount, "accountId" | "environment">;
};

export function buildClosePositionDraft({
  position,
  account,
}: ClosePositionDraftInput): OrderDraft | null {
  const qty = position.position ?? 0;
  if (!Number.isFinite(qty) || qty === 0) return null;

  const symbol = position.contract.symbol?.trim();
  if (!symbol) return null;

  const accountId = account.accountId.trim();
  if (!accountId) return null;

  return {
    accountId,
    symbol: symbol.toUpperCase(),
    side: qty > 0 ? "SELL" : "BUY",
    quantity: Math.abs(qty),
    orderType: "MKT",
    environment: account.environment,
    outsideRth: false,
    tif: "DAY",
  };
}

export function describeClosePositionAction(draft: OrderDraft): string {
  return `${draft.side} ${draft.quantity} ${draft.symbol} MKT`;
}
