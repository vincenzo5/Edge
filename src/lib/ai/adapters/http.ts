import type { ToolContext } from "../context";
import { createServiceMarketDataPort } from "../marketDataPort";
import { createServiceTradingPort } from "../tradingPort";
import { getServerMarketDataService } from "@/lib/marketData/service/server";
import { getTradingService } from "@/lib/trading/tradingService";
import { resolveTradingAccountId } from "@/lib/trading/activeAccount";

/** Build a server-side ToolContext for market-data tools (no browser session). */
export function createServerToolContext(): ToolContext {
  const tradingService = getTradingService();
  return {
    clientSession: false,
    app: null,
    chart: null,
    watchlist: null,
    screener: null,
    risk: null,
    account: null,
    options: null,
    marketData: createServiceMarketDataPort(getServerMarketDataService()),
    trading: createServiceTradingPort({
      listAccounts: () => tradingService.listAccounts(),
      previewOrder: (draft) => tradingService.previewOrder(draft),
      submitOrder: (draft, idempotencyKey, previewIntentId, liveConfirmation) =>
        tradingService.submitOrder(draft, idempotencyKey, previewIntentId, liveConfirmation),
      cancelOrder: (accountId, orderId, intentId, environment, liveConfirmation) =>
        tradingService.cancelOrder(
          accountId,
          orderId,
          intentId,
          environment ?? "paper",
          liveConfirmation,
        ),
      resolveDefaultAccountId: (accounts) => resolveTradingAccountId(accounts),
    }),
  };
}
