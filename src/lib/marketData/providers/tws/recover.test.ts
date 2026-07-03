import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatTwsRecoveryPhaseMessage,
  isTwsSidecarControlAllowed,
  recoverTwsSidecar,
  resetManagedSidecarProcessForTests,
} from "./recover";
import { twsHealthGate } from "./healthGate";
import {
  getTwsRecoverySession,
  resetTwsRecoverySessionForTests,
  startTwsRecoverySession,
} from "./recoverySession";

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
    process.env.TWS_ENABLED = "true";
    process.env.TWS_MANAGED = "local";
    twsHealthGate.reset();
    resetManagedSidecarProcessForTests();
    resetTwsRecoverySessionForTests();
  });

  afterEach(() => {
    delete process.env.TWS_ENABLED;
    delete process.env.TWS_MANAGED;
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
      probeStatus: async () => ({
        configured: true,
        sidecarReachable: true,
        gatewayConnected: true,
        warnings: [],
      }),
      reconnect,
      warmup,
      resetGate,
    });

    expect(result.ok).toBe(true);
    expect(result.commandState).toBe("confirmed");
    expect(result.action).toBe("reconnected");
    expect(reconnect).toHaveBeenCalledOnce();
    expect(warmup).not.toHaveBeenCalled();
    expect(resetGate).toHaveBeenCalledOnce();
  });

  it("returns failed when external mode and sidecar unreachable", async () => {
    process.env.TWS_MANAGED = "external";

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
      probeHealth: async () => false,
      probeStatus: async () => null,
      reconnect: vi.fn(),
      warmup: vi.fn(),
      resetGate: vi.fn(),
    });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Start manually/i);
  });

  it("returns failed when foreign edge-local sidecar owns the port", async () => {
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
      probeHealth: async () => false,
      fetchHealth: async () => ({
        ok: true,
        managedBy: "edge-local",
        instanceId: "foreign-instance",
        capabilities: { controlRecovery: true },
      }),
      probeStatus: async () => null,
      reconnect: vi.fn(),
      warmup: vi.fn(),
      resetGate: vi.fn(),
    });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/another Edge dev instance/i);
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
      probeStatus: async () => ({
        configured: true,
        sidecarReachable: true,
        gatewayConnected: true,
        warnings: [],
      }),
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
      probeStatus: async () => ({
        configured: true,
        sidecarReachable: true,
        gatewayConnected: false,
        warnings: [],
      }),
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
    expect(result.commandState).toBe("failed");
    expect(result.message).toMatch(/Gateway still disconnected/i);
  });

  it("returns timed_out when reconnect aborts but sidecar is reachable", async () => {
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
      probeStatus: async () => ({
        configured: true,
        sidecarReachable: true,
        gatewayConnected: false,
        reconnectInProgress: true,
        warnings: [],
      }),
      reconnect: async () => {
        throw new Error("The operation was aborted due to timeout");
      },
      warmup: async () => {},
      resetGate: () => twsHealthGate.reset(),
    });

    expect(result.ok).toBe(false);
    expect(result.commandState).toBe("timed_out");
    expect(result.message).toMatch(/Reconnecting to IB Gateway/i);
    expect(result.status.sidecarReachable).toBe(true);
    expect(result.recoveryPhase).toBe("reconnect_in_progress");
  });

  it("restarts sidecar when preflight status reports wedged worker", async () => {
    const restartSidecar = vi.fn(async () => true);
    const reconnect = vi.fn(async () => ({
      configured: true,
      sidecarReachable: true,
      gatewayConnected: true,
      warnings: [],
    }));
    let statusCalls = 0;

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
      probeStatus: async () => {
        statusCalls += 1;
        if (statusCalls === 1) {
          return {
            configured: true,
            sidecarReachable: true,
            gatewayConnected: false,
            restartRequired: true,
            warnings: [],
            diagnostics: { workerWedged: true, activeJob: "stream_quotes" },
          };
        }
        return {
          configured: true,
          sidecarReachable: true,
          gatewayConnected: false,
          warnings: [],
        };
      },
      restartSidecar,
      reconnect,
      warmup: async () => {},
      resetGate: () => twsHealthGate.reset(),
    });

    expect(restartSidecar).toHaveBeenCalledOnce();
    expect(reconnect).toHaveBeenCalledOnce();
    expect(result.ok).toBe(true);
    expect(result.action).toBe("restarted");
  });

  it("returns client_id_stuck when restart still reports stuck client", async () => {
    const restartSidecar = vi.fn(async () => true);

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
      probeStatus: async () => ({
        configured: true,
        sidecarReachable: true,
        gatewayConnected: false,
        connectionState: "client_id_stuck" as const,
        restartRequired: true,
        warnings: [],
      }),
      restartSidecar,
      reconnect: async () => ({
        configured: true,
        sidecarReachable: true,
        gatewayConnected: false,
        warnings: [],
      }),
      warmup: async () => {},
      resetGate: () => twsHealthGate.reset(),
    });

    expect(result.ok).toBe(false);
    expect(result.recoveryPhase).toBe("client_id_stuck");
    expect(result.message).toMatch(/client ID stuck/i);
  });

  it("returns accepted when reconnect is still in progress", async () => {
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
      probeStatus: async () => ({
        configured: true,
        sidecarReachable: true,
        gatewayConnected: false,
        warnings: [],
      }),
      reconnect: async () => ({
        configured: true,
        sidecarReachable: true,
        gatewayConnected: false,
        reconnectInProgress: true,
        host: "127.0.0.1",
        port: 4001,
        warnings: [],
      }),
      warmup: async () => {},
      resetGate: () => twsHealthGate.reset(),
    });

    expect(result.ok).toBe(false);
    expect(result.commandState).toBe("accepted");
    expect(result.recoveryPhase).toBe("reconnect_in_progress");
  });

  it("preserves recovery session context started by the route", async () => {
    startTwsRecoverySession({
      symbols: ["AAPL"],
      candleRequests: [{ symbol: "AAPL", interval: "1d", range: "1mo" }],
      optionsSymbol: "AAPL",
    });

    await recoverTwsSidecar(["AAPL"], {
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
      probeStatus: async () => ({
        configured: true,
        sidecarReachable: true,
        gatewayConnected: true,
        warnings: [],
      }),
      reconnect: async () => ({
        configured: true,
        sidecarReachable: true,
        gatewayConnected: true,
        warnings: [],
      }),
      resetGate: () => twsHealthGate.reset(),
    });

    const session = getTwsRecoverySession();
    expect(session?.symbols).toEqual(["AAPL"]);
    expect(session?.candleRequests).toEqual([
      { symbol: "AAPL", interval: "1d", range: "1mo" },
    ]);
    expect(session?.optionsSymbol).toBe("AAPL");
  });
});

describe("formatTwsRecoveryPhaseMessage", () => {
  it("describes sidecar unresponsive and worker wedged states", () => {
    expect(
      formatTwsRecoveryPhaseMessage({
        configured: true,
        sidecarReachable: false,
        gatewayConnected: false,
        warnings: [],
      }),
    ).toMatch(/Sidecar unresponsive/i);

    expect(
      formatTwsRecoveryPhaseMessage({
        configured: true,
        sidecarReachable: true,
        gatewayConnected: false,
        restartRequired: true,
        warnings: [],
        diagnostics: { workerWedged: true, activeJob: "reconnect" },
      }),
    ).toMatch(/restarting sidecar/i);

    expect(
      formatTwsRecoveryPhaseMessage({
        configured: true,
        sidecarReachable: true,
        gatewayConnected: false,
        connectionState: "client_id_stuck",
        restartRequired: true,
        warnings: [],
      }),
    ).toMatch(/client ID stuck/i);
  });
});

describe("recoverTwsSidecar configuration guard", () => {
  it("throws when TWS is not configured", async () => {
    await expect(
      recoverTwsSidecar([], {
        isControlAllowed: () => false,
        isConfigured: () => false,
      }),
    ).rejects.toThrow(/not configured/i);
  });
});
