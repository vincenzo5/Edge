import { describe, expect, it, beforeEach } from "vitest";
import { createDataResult } from "../contracts/result";
import { RouteCollector } from "./routeCollector";
import {
  getDeliveryRegistry,
  MAX_HEARTBEAT_ENTRIES,
  resetDeliveryRegistryForTests,
} from "./deliveryRegistry";
import { finalizeRouteDelivery } from "./serviceInstrumentation";
import { STATE_RETENTION } from "./adapters";

describe("delivery registry", () => {
  beforeEach(() => {
    resetDeliveryRegistryForTests();
  });

  it("records route attempts and selected source", () => {
    const route = new RouteCollector();
    route.recordSkipped("tws", "Temporarily bypassed");
    route.recordSuccess("yahoo", Date.now() - 50);

    const result = createDataResult([], "yahoo", {
      requestedAt: Date.now() - 100,
      receivedAt: Date.now(),
      warnings: ["TWS temporarily skipped"],
    });

    finalizeRouteDelivery(result, "chart_candles", route, {
      fallbackReason: "TWS temporarily skipped",
      transport: "request",
    });

    const snapshot = getDeliveryRegistry().getSanitizedSnapshot();
    expect(snapshot.datasets).toHaveLength(1);
    expect(snapshot.datasets[0]?.source).toBe("yahoo");
    expect(snapshot.datasets[0]?.routeAttemptCount).toBe(2);
    expect(snapshot.datasets[0]?.provenance).toBe("fallback");
  });

  it("coalesces streaming heartbeats within the window", () => {
    const registry = getDeliveryRegistry();
    const result = createDataResult([], "tws", {
      requestedAt: Date.now(),
      receivedAt: Date.now(),
    });

    registry.recordFromResult(result, "chart_candles", { transport: "streaming" });
    registry.recordFromResult(result, "chart_candles", { transport: "streaming" });

    expect(registry.getSanitizedSnapshot().datasets).toHaveLength(1);
  });

  it("respects dataset retention caps", () => {
    const registry = getDeliveryRegistry();
    for (let i = 0; i < STATE_RETENTION.maxDatasetStates + 5; i++) {
      registry.recordFromResult(createDataResult([], "yahoo"), "instrument_search", {
        consumerId: `consumer-${i}`,
      });
    }
    expect(registry.getSnapshot().datasets.size).toBeLessThanOrEqual(
      STATE_RETENTION.maxDatasetStates,
    );
  });

  it("bounds high-cardinality heartbeat consumers and prunes evicted keys", () => {
    const registry = getDeliveryRegistry();
    for (let i = 0; i < MAX_HEARTBEAT_ENTRIES + 25; i++) {
      registry.recordFromResult(createDataResult([], "tws"), "instrument_search", {
        consumerId: `stream-${i}`,
        transport: "streaming",
      });
    }

    expect(registry.getHeartbeatEntryCount()).toBeLessThanOrEqual(
      Math.min(MAX_HEARTBEAT_ENTRIES, STATE_RETENTION.maxDatasetStates),
    );
  });

  it("redacts warnings in sanitized snapshots", () => {
    const registry = getDeliveryRegistry();
    registry.recordFromResult(
      createDataResult([], "tws", {
        warnings: ['provider failed with "token": "secret value" for DU123456'],
      }),
      "chart_candles",
    );

    expect(JSON.stringify(registry.getSanitizedSnapshot())).not.toMatch(
      /secret value|DU123456/,
    );
  });

  it("sanitizes route detail length", () => {
    const route = new RouteCollector();
    route.recordSkipped(
      "tws",
      `api_key=secret accountId=DU123456 ${"x".repeat(200)}`,
    );
    const detail = route.buildDecision("yahoo", "y".repeat(200)).attempts?.[0]?.detail;
    expect(detail?.length).toBeLessThanOrEqual(120);
    expect(detail).not.toMatch(/secret|DU123456/);
  });
});
