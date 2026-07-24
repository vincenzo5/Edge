import { describe, expect, it, beforeEach } from "vitest";
import {
  DISPLAY_TRANSIENT_HOLD_MS,
  reduceConnectionSupervisor,
  resetConnectionSupervisorSequenceForTests,
  stabilizeDisplaySocket,
  buildRouteAvailability,
  displaySocketsToIbRows,
} from "./connectionSupervisor";
import type { TwsStatusProbe } from "../providers/tws/client";
import { createSnapshotRevision } from "./revision";

function baseTws(overrides: Partial<TwsStatusProbe> = {}): TwsStatusProbe {
  return {
    configured: true,
    sidecarReachable: true,
    gatewayConnected: true,
    host: "127.0.0.1",
    port: 4002,
    warnings: [],
    connections: {
      "ib-paper": {
        gatewayConnected: true,
        connectionState: "connected",
        observationConfidence: "live",
        observedAt: 1_000,
        host: "127.0.0.1",
        port: 4002,
      },
      "ib-live": {
        gatewayConnected: true,
        connectionState: "connected",
        observationConfidence: "live",
        observedAt: 1_000,
        host: "127.0.0.1",
        port: 4001,
      },
    },
    ...overrides,
  };
}

const closedGate = {
  skipUntil: 0,
  lastFailure: null,
  failureCount: 0,
  lastSuccessAt: 0,
};

describe("connectionSupervisor", () => {
  beforeEach(() => {
    resetConnectionSupervisorSequenceForTests();
  });

  it("holds transient disconnect on display while raw stays disconnected", () => {
    const now = 10_000;
    const connected = stabilizeDisplaySocket(
      {
        connectionId: "ib-paper",
        gatewayConnected: true,
        observedAt: now - 100,
        connectionState: "connected",
      },
      baseTws(),
      undefined,
      now - 100,
    );
    const disconnected = stabilizeDisplaySocket(
      {
        connectionId: "ib-paper",
        gatewayConnected: false,
        observedAt: now,
        connectionState: "unknown",
        observationConfidence: "unknown",
      },
      baseTws({ gatewayConnected: false }),
      connected,
      now,
    );
    expect(disconnected.rawConnected).toBe(false);
    expect(disconnected.status).toBe("healthy");
  });

  it("starts the transient hold when disconnect begins after a long healthy period", () => {
    const healthySince = 10_000;
    const disconnectAt = healthySince + 10_000;
    const connected = stabilizeDisplaySocket(
      {
        connectionId: "ib-paper",
        gatewayConnected: true,
        observedAt: healthySince,
        connectionState: "connected",
      },
      baseTws(),
      undefined,
      healthySince,
    );
    const held = stabilizeDisplaySocket(
      {
        connectionId: "ib-paper",
        gatewayConnected: false,
        observedAt: disconnectAt,
        connectionState: "unknown",
      },
      baseTws({ gatewayConnected: false }),
      connected,
      disconnectAt,
    );

    expect(held.status).toBe("healthy");
    expect(held.pendingDegradeAt).toBe(disconnectAt);
  });

  it("degrades display immediately for gateway_disconnected and worker wedge", () => {
    const now = 20_000;
    const previous = stabilizeDisplaySocket(
      {
        connectionId: "ib-paper",
        gatewayConnected: true,
        observedAt: now - 100,
      },
      baseTws(),
      undefined,
      now - 100,
    );
    const degraded = stabilizeDisplaySocket(
      {
        connectionId: "ib-paper",
        gatewayConnected: false,
        connectionState: "gateway_disconnected",
        observedAt: now,
      },
      baseTws({
        gatewayConnected: false,
        connectionState: "gateway_disconnected",
        diagnostics: { workerWedged: true },
      }),
      previous,
      now,
    );
    expect(degraded.status).toBe("degraded");
  });

  it("confirms disconnect after hold window expires", () => {
    const start = 30_000;
    const connected = stabilizeDisplaySocket(
      {
        connectionId: "ib-paper",
        gatewayConnected: true,
        observedAt: start,
      },
      baseTws(),
      undefined,
      start,
    );
    const held = stabilizeDisplaySocket(
      {
        connectionId: "ib-paper",
        gatewayConnected: false,
        observedAt: start + 500,
        connectionState: "unknown",
      },
      baseTws({ gatewayConnected: false }),
      connected,
      start + 500,
    );
    const confirmed = stabilizeDisplaySocket(
      {
        connectionId: "ib-paper",
        gatewayConnected: false,
        observedAt: start + 500 + DISPLAY_TRANSIENT_HOLD_MS + 1,
        connectionState: "unknown",
      },
      baseTws({ gatewayConnected: false }),
      held,
      start + 500 + DISPLAY_TRANSIENT_HOLD_MS + 1,
    );
    expect(confirmed.status).toBe("degraded");
  });

  it("isolates paper-only socket loss from live socket", () => {
    const snapshot = reduceConnectionSupervisor(null, {
      tws: baseTws({
        gatewayConnected: true,
        connections: {
          "ib-paper": {
            gatewayConnected: false,
            connectionState: "gateway_disconnected",
            observedAt: 5_000,
            host: "127.0.0.1",
            port: 4002,
          },
          "ib-live": {
            gatewayConnected: true,
            connectionState: "connected",
            observedAt: 5_000,
            host: "127.0.0.1",
            port: 4001,
          },
        },
      }),
      twsGate: closedGate,
      dataPreferenceLabel: "Paper data",
      generatedAt: 5_000,
    }, 5_000);

    const paper = snapshot.displaySockets.find((row) => row.connectionId === "ib-paper");
    const live = snapshot.displaySockets.find((row) => row.connectionId === "ib-live");
    expect(paper?.status).toBe("degraded");
    expect(live?.status).toBe("healthy");
    expect(displaySocketsToIbRows(snapshot.displaySockets)).toHaveLength(2);
  });

  it("projects IBKR circuit without fabricating TWS disconnect", () => {
    const snapshot = reduceConnectionSupervisor(null, {
      tws: baseTws(),
      twsGate: closedGate,
      ibkrGate: {
        skipUntil: 50_000,
        lastFailure: "auth_failure",
        failureCount: 1,
        lastSuccessAt: 0,
      },
      dataPreferenceLabel: "Paper data",
      generatedAt: 10_000,
    }, 10_000);

    const ibkr = snapshot.routeAvailability.find((row) => row.provider === "ibkr");
    expect(ibkr?.circuitOpen).toBe(true);
    expect(snapshot.displaySockets.every((row) => row.status === "healthy")).toBe(true);
  });

  it("rejects stale supervisor revisions", () => {
    const revision = createSnapshotRevision(2, 20_000);
    const first = reduceConnectionSupervisor(null, {
      tws: baseTws(),
      twsGate: closedGate,
      revision,
      generatedAt: 20_000,
    }, 20_000);

    const stale = reduceConnectionSupervisor(first, {
      tws: baseTws({ gatewayConnected: false }),
      twsGate: closedGate,
      revision: createSnapshotRevision(1, 19_000, revision.epoch),
      generatedAt: 19_000,
    }, 19_000);

    expect(stale).toBe(first);
  });

  it("builds route availability with retry deadlines", () => {
    const now = 15_000;
    const routes = buildRouteAvailability({
      twsGate: {
        skipUntil: now + 5_000,
        lastFailure: "timeout",
        failureCount: 2,
        lastSuccessAt: 0,
      },
      now,
    });
    expect(routes[0]?.retryDeadline).toBe(now + 5_000);
    expect(routes[0]?.circuitOpen).toBe(true);
  });
});
