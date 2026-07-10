import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getAccounts } from "@/app/api/trading/accounts/route";
import { POST as postPreview } from "@/app/api/trading/preview/route";
import { POST as postOrders } from "@/app/api/trading/orders/route";
import {
  PATCH as patchOrder,
  DELETE as deleteOrder,
} from "@/app/api/trading/orders/[orderId]/route";

const mockListAccounts = vi.fn();
const mockPreviewOrder = vi.fn();
const mockSubmitOrder = vi.fn();
const mockModifyOrder = vi.fn();
const mockCancelOrder = vi.fn();

vi.mock("@/lib/trading/tradingService", () => ({
  isTradingConfigured: vi.fn(() => true),
  isPaperTradingConfigured: vi.fn(() => true),
  getTradingService: vi.fn(() => ({
    listAccounts: mockListAccounts,
    previewOrder: mockPreviewOrder,
    submitOrder: mockSubmitOrder,
    modifyOrder: mockModifyOrder,
    cancelOrder: mockCancelOrder,
  })),
  TradingReadinessBlockedError: class TradingReadinessBlockedError extends Error {
    reasons: string[] = [];
  },
}));

describe("/api/trading routes", () => {
  beforeEach(() => {
    mockListAccounts.mockReset();
    mockPreviewOrder.mockReset();
    mockSubmitOrder.mockReset();
    mockModifyOrder.mockReset();
    mockCancelOrder.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("GET /accounts returns trading accounts", async () => {
    mockListAccounts.mockResolvedValue([
      {
        broker: "ib",
        connectionId: "tws-sidecar",
        accountId: "DUP586813",
        environment: "paper",
      },
    ]);

    const res = await getAccounts(new Request("http://localhost/api/trading/accounts"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accounts[0].accountId).toBe("DUP586813");
    expect(body.defaultAccountId).toBe("DUP586813");
  });

  it("POST /preview validates draft", async () => {
    const req = new NextRequest("http://localhost/api/trading/preview", {
      method: "POST",
      body: JSON.stringify({
        accountId: "DUP586813",
        symbol: "F",
        side: "BUY",
        quantity: 1,
        orderType: "LMT",
        environment: "paper",
      }),
    });
    const res = await postPreview(req);
    expect(res.status).toBe(400);
  });

  it("POST /orders submits with idempotency key", async () => {
    mockSubmitOrder.mockResolvedValue({
      order: { orderId: 9, permId: 123 },
      orderRef: "edge-intent-abc",
      intent: { intentId: "abc", status: "submitted" },
    });

    const req = new NextRequest("http://localhost/api/trading/orders", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: "key-1",
        draft: {
          accountId: "DUP586813",
          symbol: "F",
          side: "BUY",
          quantity: 1,
          orderType: "MKT",
          environment: "paper",
        },
      }),
    });
    const res = await postOrders(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.order.orderId).toBe(9);
    expect(mockSubmitOrder).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: "F" }),
      "key-1",
      undefined,
      undefined,
    );
  });

  it("POST /orders forwards previewIntentId", async () => {
    mockSubmitOrder.mockResolvedValue({
      order: { orderId: 9, permId: 123 },
      orderRef: "edge-intent-abc",
      intent: { intentId: "abc", status: "submitted" },
    });

    const req = new NextRequest("http://localhost/api/trading/orders", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: "key-2",
        previewIntentId: "preview-intent-1",
        draft: {
          accountId: "DUP586813",
          symbol: "F",
          side: "BUY",
          quantity: 1,
          orderType: "MKT",
          environment: "paper",
        },
      }),
    });
    const res = await postOrders(req);
    expect(res.status).toBe(200);
    expect(mockSubmitOrder).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: "F" }),
      "key-2",
      "preview-intent-1",
      undefined,
    );
  });

  it("PATCH /orders/:id modifies with accountId query param", async () => {
    mockModifyOrder.mockResolvedValue({
      order: { orderId: 10, lmtPrice: 12.5 },
      intent: null,
    });

    const req = new NextRequest(
      "http://localhost/api/trading/orders/10?accountId=DUP586813",
      {
        method: "PATCH",
        body: JSON.stringify({ limitPrice: 12.5 }),
      },
    );
    const res = await patchOrder(req, {
      params: Promise.resolve({ orderId: "10" }),
    });
    expect(res.status).toBe(200);
    expect(mockModifyOrder).toHaveBeenCalledWith(
      "DUP586813",
      10,
      { limitPrice: 12.5 },
      undefined,
      "paper",
      undefined,
    );
  });

  it("PATCH /orders/:id rejects missing accountId", async () => {
    const req = new NextRequest("http://localhost/api/trading/orders/10", {
      method: "PATCH",
      body: JSON.stringify({ limitPrice: 12.5 }),
    });
    const res = await patchOrder(req, {
      params: Promise.resolve({ orderId: "10" }),
    });
    expect(res.status).toBe(400);
  });

  it("DELETE /orders/:id cancels with accountId query param", async () => {
    mockCancelOrder.mockResolvedValue({
      order: { orderId: 10, status: "Cancelled" },
      intent: null,
    });

    const req = new NextRequest(
      "http://localhost/api/trading/orders/10?accountId=DUP586813",
      { method: "DELETE" },
    );
    const res = await deleteOrder(req, {
      params: Promise.resolve({ orderId: "10" }),
    });
    expect(res.status).toBe(200);
    expect(mockCancelOrder).toHaveBeenCalledWith(
      "DUP586813",
      10,
      undefined,
      "paper",
      undefined,
    );
  });
});
