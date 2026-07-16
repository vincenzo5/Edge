import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IbTwsTradingAdapter } from "./ibTws";

const mockWhatIf = vi.fn();
const mockGetStatus = vi.fn();

vi.mock("@/lib/brokerage/brokerageClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/brokerage/brokerageClient")>();
  return {
    ...actual,
    createBrokerageClient: vi.fn(() => ({
      getStatus: mockGetStatus,
      whatIfOrder: mockWhatIf,
      getConfig: () => ({ baseUrl: "http://127.0.0.1:8765", timeoutMs: 1000 }),
    })),
  };
});

vi.mock("@/lib/brokerage/brokerageHealthGate", () => ({
  shouldTryBrokerage: vi.fn(() => true),
  recordBrokerageSuccess: vi.fn(),
  recordBrokerageFailure: vi.fn(),
  classifyBrokerageError: vi.fn(() => "request_failed"),
}));

describe("IbTwsTradingAdapter", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    mockWhatIf.mockReset();
    mockGetStatus.mockReset();
    process.env.TWS_PORT = "4002";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps managed accounts from sidecar status", async () => {
    mockGetStatus.mockResolvedValue({
      enabled: true,
      connected: true,
      managedAccounts: ["DUP586813"],
      timestamp: Date.now(),
    });
    const adapter = new IbTwsTradingAdapter({
      baseUrl: "http://127.0.0.1:8765",
      timeoutMs: 1000,
    });
    const accounts = await adapter.listAccounts();
    expect(accounts).toEqual([
      {
        broker: "ib",
        connectionId: "ib-paper",
        accountId: "DUP586813",
        environment: "paper",
        availability: "online",
      },
    ]);
  });

  it("places order via sidecar trading endpoint", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          order: { orderId: 9, permId: 123, status: "Submitted" },
          updatedAt: 1,
        }),
    });

    const adapter = new IbTwsTradingAdapter({
      baseUrl: "http://127.0.0.1:8765",
      timeoutMs: 1000,
    });

    const result = await adapter.place({
      accountId: "DUP586813",
      symbol: "F",
      side: "BUY",
      quantity: 1,
      orderType: "MKT",
      tif: "DAY",
      environment: "paper",
      orderRef: "edge-intent-test",
    });

    expect(result.order.orderId).toBe(9);
    expect(result.orderRef).toBe("edge-intent-test");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8765/trading/orders",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("modifies order via sidecar trading endpoint", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          order: { orderId: 10, lmtPrice: 12.5, status: "Submitted" },
          updatedAt: 1,
        }),
    });

    const adapter = new IbTwsTradingAdapter({
      baseUrl: "http://127.0.0.1:8765",
      timeoutMs: 1000,
    });

    const result = await adapter.modify("DUP586813", 10, { limitPrice: 12.5 });
    expect(result.order.lmtPrice).toBe(12.5);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8765/trading/orders/10",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("lists open orders with optional account filter", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          orders: [
            { orderId: 1, account: "DUP586813", orderRef: "edge-intent-1" },
            { orderId: 2, account: "DU999999", orderRef: "edge-intent-2" },
          ],
          updatedAt: 1,
        }),
    });

    const adapter = new IbTwsTradingAdapter({
      baseUrl: "http://127.0.0.1:8765",
      timeoutMs: 1000,
    });

    const orders = await adapter.listOpenOrders("DUP586813");
    expect(orders).toHaveLength(1);
    expect(orders[0]?.orderId).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8765/account/orders?connectionId=ib-paper&accountId=DUP586813",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("places STP order via sidecar trading endpoint", async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          order: { orderId: 11, permId: 125, status: "Submitted", auxPrice: 8.5 },
          updatedAt: 1,
        }),
    });

    const adapter = new IbTwsTradingAdapter({
      baseUrl: "http://127.0.0.1:8765",
      timeoutMs: 1000,
    });

    await adapter.place({
      accountId: "DUP586813",
      symbol: "F",
      side: "BUY",
      quantity: 1,
      orderType: "STP",
      stopPrice: 8.5,
      outsideRth: false,
      tif: "DAY",
      environment: "paper",
      orderRef: "edge-intent-stp",
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string,
    );
    expect(body.orderType).toBe("STP");
    expect(body.stopPrice).toBe(8.5);
    expect(body.outsideRth).toBe(false);
    expect(body.connectionId).toBe("ib-paper");
  });
});
