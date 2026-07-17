import { describe, expect, it } from "vitest";

import {
  advanceCursorFromExecutions,
  executionFingerprint,
  executionsToFillInputs,
  filterNewExecutions,
  floorToIntervalMs,
  shouldAttemptFlexGapBackfill,
} from "@/lib/brokerage/ingest/ingestExecutions";

describe("ingestExecutions", () => {
  it("maps executions to journal fill inputs", () => {
    const inputs = executionsToFillInputs([
      {
        execId: "e1",
        time: "20260707;133000",
        side: "BOT",
        shares: 5,
        price: 101.25,
        symbol: "AAPL",
        secType: "STK",
      },
    ]);
    expect(inputs).toHaveLength(1);
    expect(inputs[0]?.execId).toBe("e1");
    expect(inputs[0]?.source).toBe("live");
  });

  it("advances cursor with latest exec time and bounded exec ids", () => {
    const next = advanceCursorFromExecutions(
      { lastExecTime: null, lastSeenExecIds: [] },
      [
        { execId: "a", time: "20260707;120000", shares: 1, price: 1 },
        { execId: "b", time: "20260707;130000", shares: 1, price: 1 },
      ],
    );
    expect(next.lastSeenExecIds).toEqual(["a", "b"]);
    expect(next.lastExecTime).toBeTruthy();
  });

  it("filters already seen executions", () => {
    const fresh = filterNewExecutions(
      [
        { execId: "a", shares: 1, price: 1 },
        { execId: "b", shares: 1, price: 1 },
      ],
      ["a"],
    );
    expect(fresh.map((row) => row.execId)).toEqual(["b"]);
  });

  it("builds stable execution fingerprint", () => {
    expect(
      executionFingerprint([
        { execId: "b", shares: 1, price: 1 },
        { execId: "a", shares: 1, price: 1 },
      ]),
    ).toBe("a\0b");
  });

  it("detects flex gap when last ingest is stale", () => {
    const stale = new Date(Date.now() - 5 * 60 * 60 * 1000);
    expect(
      shouldAttemptFlexGapBackfill(
        { lastExecTime: stale.toISOString(), lastSeenExecIds: ["x"] },
        stale,
      ),
    ).toBe(true);
  });

  it("floors timestamps to interval buckets", () => {
    expect(floorToIntervalMs(125_000, 60_000)).toBe(120_000);
  });
});
