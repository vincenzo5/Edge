import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isTwsSidecarControlAllowed,
  recoverTwsSidecar,
  resetManagedSidecarProcessForTests,
} from "./recover";
import { twsHealthGate } from "./healthGate";

describe("isTwsSidecarControlAllowed", () => {
  afterEach(() => {
    delete process.env.TWS_ENABLED;
  });

  it("is allowed when TWS is configured", () => {
    process.env.TWS_ENABLED = "true";
    expect(isTwsSidecarControlAllowed()).toBe(true);
  });

  it("is not allowed when TWS is disabled", () => {
    process.env.TWS_ENABLED = "false";
    expect(isTwsSidecarControlAllowed()).toBe(false);
  });
});

describe("recoverTwsSidecar", () => {
  beforeEach(() => {
    twsHealthGate.reset();
    resetManagedSidecarProcessForTests();
  });

  it("reconnects reachable sidecar and resets gate when gateway is connected", async () => {
    const resetGate = vi.fn();
    const reconnect = vi.fn(async () => ({
      configured: true,
      sidecarReachable: true,
      gatewayConnected: true,
      warnings: [],
    }));
    const warmup = vi.fn(async () => {});

    const result = await recoverTwsSidecar(["AAPL"], {
      isControlAllowed: () => true,
      isConfigured: () => true,
      getConfig: () => ({
        baseUrl: "http://127.0.0.1:8765",
        timeoutMs: 1000,
        candlesTimeoutMs: 1000,
        quotesTimeoutMs: 1000,
        optionsTimeoutMs: 1000,
      }),
      probeHealth: async () => true,
      reconnect,
      warmup,
      resetGate,
    });

    expect(result.ok).toBe(true);
    expect(result.action).toBe("reconnected");
    expect(reconnect).toHaveBeenCalledOnce();
    expect(warmup).not.toHaveBeenCalled();
    expect(resetGate).toHaveBeenCalledOnce();
  });

  it("starts sidecar when unreachable then reconnects", async () => {
    let reachable = false;
    const startSidecar = vi.fn(async () => {
      reachable = true;
      return true;
    });

    const result = await recoverTwsSidecar([], {
      isControlAllowed: () => true,
      isConfigured: () => true,
      getConfig: () => ({
        baseUrl: "http://127.0.0.1:8765",
        timeoutMs: 1000,
        candlesTimeoutMs: 1000,
        quotesTimeoutMs: 1000,
        optionsTimeoutMs: 1000,
      }),
      probeHealth: async () => reachable,
      waitForHealth: async () => {
        reachable = true;
        return true;
      },
      startSidecar,
      reconnect: async () => ({
        configured: true,
        sidecarReachable: true,
        gatewayConnected: true,
        warnings: [],
      }),
      warmup: async () => {},
      resetGate: () => twsHealthGate.reset(),
    });

    expect(startSidecar).toHaveBeenCalledOnce();
    expect(result.ok).toBe(true);
    expect(result.action).toBe("started");
  });

  it("returns actionable message when gateway is still disconnected", async () => {
    const result = await recoverTwsSidecar([], {
      isControlAllowed: () => true,
      isConfigured: () => true,
      getConfig: () => ({
        baseUrl: "http://127.0.0.1:8765",
        timeoutMs: 1000,
        candlesTimeoutMs: 1000,
        quotesTimeoutMs: 1000,
        optionsTimeoutMs: 1000,
      }),
      probeHealth: async () => true,
      reconnect: async () => ({
        configured: true,
        sidecarReachable: true,
        gatewayConnected: false,
        warnings: ["Not connected"],
      }),
      warmup: async () => {},
      resetGate: () => twsHealthGate.reset(),
    });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Gateway still disconnected/i);
  });

  it("throws when TWS is not configured", async () => {
    await expect(
      recoverTwsSidecar([], {
        isControlAllowed: () => false,
        isConfigured: () => false,
      }),
    ).rejects.toThrow(/not configured/i);
  });
});
