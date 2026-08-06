import { describe, expect, it } from "vitest";
import {
  IB_LIVE_CONNECTION_ID,
  IB_PAPER_CONNECTION_ID,
  resolveConnectionByEnvironment,
  resolveConnectionById,
  resolveManageQuoteConnectionId,
} from "./connectionRegistry";
import { getStubTradingAdapter } from "./adapters/stub";
import { resolveAdapter } from "./connectionRegistry";

describe("connectionRegistry", () => {
  it("resolves paper and live connection ids", () => {
    expect(resolveConnectionByEnvironment("paper").connectionId).toBe(IB_PAPER_CONNECTION_ID);
    expect(resolveConnectionByEnvironment("live").connectionId).toBe(IB_LIVE_CONNECTION_ID);
    expect(resolveConnectionById(IB_PAPER_CONNECTION_ID).port).toBe(4002);
    expect(resolveConnectionById(IB_LIVE_CONNECTION_ID).port).toBe(4001);
  });

  it("routes manage quotes through live for both paper and live instances", () => {
    expect(resolveManageQuoteConnectionId("paper")).toBe(IB_LIVE_CONNECTION_ID);
    expect(resolveManageQuoteConnectionId("live")).toBe(IB_LIVE_CONNECTION_ID);
  });

  it("returns stub adapter for stub broker", async () => {
    const adapter = resolveAdapter("stub");
    expect(adapter).toBe(getStubTradingAdapter());
    await expect(adapter.preview({
      accountId: "A",
      symbol: "F",
      side: "BUY",
      quantity: 1,
      orderType: "MKT",
      environment: "paper",
      outsideRth: false,
      tif: "DAY",
    })).rejects.toThrow();
  });
});
