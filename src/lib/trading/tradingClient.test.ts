import { describe, expect, it, vi, afterEach } from "vitest";
import {
  cancelOrder,
  fetchTradingAccounts,
  previewOrder,
  submitOrder,
  TradingApiError,
} from "./tradingClient";
import type { OrderDraft } from "./types";

const draft: OrderDraft = {
  accountId: "DUP586813",
  symbol: "AAPL",
  side: "BUY",
  quantity: 1,
  orderType: "MKT",
  environment: "paper",
  outsideRth: false,
  tif: "DAY",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("tradingClient", () => {
  it("fetchTradingAccounts returns parsed accounts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accounts: [
            {
              broker: "ib",
              connectionId: "tws",
              accountId: "DUP586813",
              environment: "paper",
            },
          ],
          defaultAccountId: "DUP586813",
        }),
      }),
    );

    const result = await fetchTradingAccounts();
    expect(result.defaultAccountId).toBe("DUP586813");
    expect(result.accounts).toHaveLength(1);
  });

  it("previewOrder throws TradingApiError on readiness block", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          error: "Trading readiness blocked",
          reasons: ["quote stale"],
        }),
      }),
    );

    await expect(previewOrder(draft)).rejects.toMatchObject({
      name: "TradingApiError",
      status: 409,
      reasons: ["quote stale"],
    } satisfies Partial<TradingApiError>);
  });

  it("submitOrder posts draft and idempotency key", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        order: { orderId: 9, symbol: "AAPL" },
        orderRef: "edge-intent-abc",
        intent: { intentId: "abc", status: "submitted" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitOrder({
      draft,
      idempotencyKey: "key-1",
      previewIntentId: "intent-1",
    });
    expect(result.orderRef).toBe("edge-intent-abc");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/trading/orders",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          draft,
          idempotencyKey: "key-1",
          previewIntentId: "intent-1",
        }),
      }),
    );
  });

  it("cancelOrder requires accountId query param", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ order: { status: "Cancelled" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await cancelOrder(10, "DUP586813");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/trading/orders/10?accountId=DUP586813",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
