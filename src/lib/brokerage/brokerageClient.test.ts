import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  createBrokerageClient,
  isBrokerageConfigured,
} from "./brokerageClient";
import { parseSummaryTagNumber } from "../marketData/contracts/brokerage";

describe("brokerageClient", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.TWS_ENABLED = "true";
    process.env.TWS_SIDECAR_URL = "http://127.0.0.1:8765";
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("isBrokerageConfigured is always on", () => {
    expect(isBrokerageConfigured()).toBe(true);
    process.env.TWS_ENABLED = "false";
    expect(isBrokerageConfigured()).toBe(true);
  });

  it("getStatus fetches account status from sidecar", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          enabled: true,
          connected: true,
          accountId: "DU123",
          managedAccounts: ["DU123"],
          timestamp: 1,
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = createBrokerageClient();
    const status = await client.getStatus();
    expect(status.accountId).toBe("DU123");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8765/account/status",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("parseSummaryTagNumber reads numeric summary tags", () => {
    expect(
      parseSummaryTagNumber({ NetLiquidation: { tag: "NetLiquidation", value: "100000.5" } }, "NetLiquidation"),
    ).toBe(100000.5);
    expect(parseSummaryTagNumber({}, "NetLiquidation")).toBeNull();
  });
});
