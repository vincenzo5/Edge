import { describe, expect, it, afterEach } from "vitest";
import { deriveTwsSystemLifecycle } from "./lifecycle";

describe("deriveTwsSystemLifecycle", () => {
  afterEach(() => {
    delete process.env.TWS_ENABLED;
    delete process.env.TWS_MANAGED;
  });

  it("returns disabled when TWS is off", () => {
    process.env.TWS_ENABLED = "false";
    expect(deriveTwsSystemLifecycle({})).toBe("disabled");
  });

  it("returns ready when gateway connected", () => {
    process.env.TWS_ENABLED = "true";
    expect(
      deriveTwsSystemLifecycle({
        health: { ok: true, managedBy: "edge-local" },
        status: {
          configured: true,
          sidecarReachable: true,
          gatewayConnected: true,
          warnings: [],
        },
      }),
    ).toBe("ready");
  });

  it("returns recovering when reconnect in progress", () => {
    process.env.TWS_ENABLED = "true";
    expect(
      deriveTwsSystemLifecycle({
        health: { ok: true },
        status: {
          configured: true,
          sidecarReachable: true,
          gatewayConnected: false,
          reconnectInProgress: true,
          warnings: [],
        },
      }),
    ).toBe("recovering");
  });

  it("returns wedged when worker is wedged", () => {
    process.env.TWS_ENABLED = "true";
    expect(
      deriveTwsSystemLifecycle({
        health: { ok: true },
        status: {
          configured: true,
          sidecarReachable: true,
          gatewayConnected: false,
          diagnostics: { workerWedged: true },
          warnings: [],
        },
      }),
    ).toBe("wedged");
  });

  it("returns gateway_disconnected when sidecar up but gateway down", () => {
    process.env.TWS_ENABLED = "true";
    expect(
      deriveTwsSystemLifecycle({
        health: { ok: true },
        status: {
          configured: true,
          sidecarReachable: true,
          gatewayConnected: false,
          connectionState: "gateway_disconnected",
          warnings: [],
        },
      }),
    ).toBe("gateway_disconnected");
  });
});
