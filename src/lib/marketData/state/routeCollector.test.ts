import { describe, expect, it } from "vitest";
import { RouteCollector } from "./routeCollector";

describe("RouteCollector", () => {
  it("builds attempted providers and fallback reason", () => {
    const collector = new RouteCollector();
    collector.recordSkipped("tws", "circuit open");
    collector.recordEmpty("ibkr", Date.now() - 20);
    collector.recordSuccess("yahoo", Date.now() - 10);

    const decision = collector.buildDecision("yahoo", "circuit open");
    expect(decision.selected).toBe("yahoo");
    expect(decision.attempted).toEqual(expect.arrayContaining(["tws", "ibkr", "yahoo"]));
    expect(decision.attempts).toHaveLength(3);
    expect(decision.fallbackReason).toBe("circuit open");
  });
});
