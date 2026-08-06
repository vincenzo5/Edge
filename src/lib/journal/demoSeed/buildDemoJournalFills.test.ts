import { describe, expect, it } from "vitest";

import { priceFromDailyBar } from "@/lib/journal/demoSeed/demoMarketPrices";
import { buildDemoJournalFills } from "@/lib/journal/demoSeed/buildDemoJournalFills";
import {
  DEMO_FILL_EXEC_ID_PREFIX,
  DEMO_JOURNAL_ACCOUNT_ID,
} from "@/lib/journal/demoSeed/demoSeedConstants";

describe("buildDemoJournalFills", () => {
  it("generates deterministic fills within expected bounds", () => {
    const a = buildDemoJournalFills();
    const b = buildDemoJournalFills();
    expect(a.fills).toEqual(b.fills);
    expect(a.fills.length).toBeGreaterThanOrEqual(160);
    expect(a.fills.length).toBeLessThanOrEqual(300);
  });

  it("uses unique exec ids and demo account on every fill", () => {
    const { fills } = buildDemoJournalFills();
    const execIds = fills.map((f) => f.execId);
    expect(new Set(execIds).size).toBe(execIds.length);
    for (const fill of fills) {
      expect(fill.execId.startsWith(DEMO_FILL_EXEC_ID_PREFIX)).toBe(true);
      expect(fill.account).toBe(DEMO_JOURNAL_ACCOUNT_ID);
      expect(fill.source).toBe("flex_csv");
    }
  });

  it("includes mixed wins and losses on closed trades", () => {
    const { fills } = buildDemoJournalFills();
    const closedRealized = fills
      .map((f) => f.realizedPNL)
      .filter((pnl): pnl is number => pnl != null);
    expect(closedRealized.length).toBeGreaterThanOrEqual(80);
    expect(closedRealized.some((pnl) => pnl > 0)).toBe(true);
    expect(closedRealized.some((pnl) => pnl < 0)).toBe(true);
  });

  it("produces mostly one round-trip per entry/exit pair after grouping", () => {
    const { fills } = buildDemoJournalFills();
    const entryFills = fills.filter((f) => f.realizedPNL == null);
    const exitFills = fills.filter((f) => f.realizedPNL != null);
    expect(entryFills.length).toBeGreaterThanOrEqual(80);
    expect(exitFills.length).toBeGreaterThanOrEqual(80);
    expect(entryFills.length - exitFills.length).toBeGreaterThanOrEqual(3);
  });

  it("exports fully populated trade metadata keyed by entry exec id", () => {
    const { fills, tradeMetadataByEntryExecId } = buildDemoJournalFills();
    const entryExecIds = fills
      .filter((f) => f.realizedPNL == null)
      .map((f) => f.execId);

    let closedWithExcursion = 0;
    let withPlaybook = 0;
    let withRating = 0;

    for (const execId of entryExecIds) {
      const meta = tradeMetadataByEntryExecId.get(execId);
      expect(meta).toBeDefined();
      expect(meta!.setup.length).toBeGreaterThan(0);
      expect(meta!.tags.length).toBeGreaterThan(0);
      expect(meta!.plannedRiskValue).toBeGreaterThan(0);
      expect(meta!.initialStop).toBeGreaterThan(0);
      expect(meta!.rating).toBeGreaterThanOrEqual(1);
      expect(meta!.rating).toBeLessThanOrEqual(5);
      expect(meta!.reviewNote.length).toBeGreaterThan(0);
      expect(typeof meta!.ignored).toBe("boolean");
      expect(meta!.managePlaybook).not.toBeNull();
      expect(meta!.managePlaybook!.templateName.length).toBeGreaterThan(0);
      expect(meta!.managePlaybook!.ruleTimeline.length).toBeGreaterThan(0);
      expect(meta!.managePlaybook!.positionPlan).toBeDefined();
      expect(meta!.managePlaybook!.protectSummary?.startsWith("Stop @")).toBe(true);
      withPlaybook += 1;
      withRating += 1;

      if (meta!.mfeUsd != null && meta!.mfaUsd != null) {
        expect(meta!.mfeUsd).toBeGreaterThanOrEqual(0);
        expect(meta!.mfaUsd).toBeGreaterThanOrEqual(0);
        expect(meta!.excursionInterval === "1m" || meta!.excursionInterval === "5m").toBe(true);
        expect(meta!.excursionComputedAt).toBeTruthy();
        closedWithExcursion += 1;
      }
    }

    expect(withPlaybook).toBe(entryExecIds.length);
    expect(withRating).toBe(entryExecIds.length);
    expect(closedWithExcursion).toBeGreaterThanOrEqual(80);
  });

  it("attaches exchange and avgPrice on every fill", () => {
    const { fills } = buildDemoJournalFills();
    for (const fill of fills) {
      expect(fill.exchange).toBe("SMART");
      expect(fill.avgPrice).toBe(fill.price);
    }
  });

  it("keeps all dollar amounts at cents precision", () => {
    const isCents = (value: number) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9;
    const { fills, tradeMetadataByEntryExecId } = buildDemoJournalFills();
    for (const fill of fills) {
      expect(isCents(fill.price)).toBe(true);
      expect(isCents(fill.avgPrice!)).toBe(true);
      expect(isCents(fill.commission!)).toBe(true);
      if (fill.realizedPNL != null) expect(isCents(fill.realizedPNL)).toBe(true);
    }
    for (const meta of tradeMetadataByEntryExecId.values()) {
      expect(isCents(meta.initialStop)).toBe(true);
      expect(isCents(meta.plannedRiskValue)).toBe(true);
      if (meta.mfeUsd != null) expect(isCents(meta.mfeUsd)).toBe(true);
      if (meta.mfaUsd != null) expect(isCents(meta.mfaUsd)).toBe(true);
      const plan = meta.managePlaybook?.positionPlan;
      expect(plan).toBeDefined();
      expect(isCents(plan!.entry)).toBe(true);
      expect(isCents(plan!.initialStop)).toBe(true);
      expect(isCents(plan!.rUnit)).toBe(true);
    }
  });

  it("anchors fill prices inside the daily bar when a price book is supplied", () => {
    const endDate = new Date("2025-06-06T12:00:00.000Z");
    const bar = { open: 100, high: 110, low: 95, close: 105 };
    const byDate = new Map<string, typeof bar>();
    for (let month of ["05", "06"]) {
      for (let day = 1; day <= 31; day += 1) {
        byDate.set(`2025-${month}-${String(day).padStart(2, "0")}`, bar);
      }
    }
    const priceBook = new Map(
      ["AAPL", "MSFT", "SPY", "NVDA", "QQQ", "TSLA", "META", "AMD"].map((symbol) => [
        symbol,
        byDate,
      ]),
    );

    const { fills } = buildDemoJournalFills({
      endDate,
      weekdayCount: 10,
      closedTradesPerDay: 1,
      openPositionCount: 1,
      priceBook,
    });

    expect(fills.length).toBeGreaterThan(0);
    for (const fill of fills) {
      expect(fill.price).toBeGreaterThanOrEqual(bar.low);
      expect(fill.price).toBeLessThanOrEqual(bar.high);
    }
  });
});

describe("priceFromDailyBar", () => {
  const bar = { open: 200, high: 210, low: 190, close: 205 };

  it("keeps long entries below exits on winning days", () => {
    const entry = priceFromDailyBar(bar, "seed-a", "entry", "long", true);
    const exit = priceFromDailyBar(bar, "seed-a", "exit", "long", true);
    expect(entry).toBeLessThan(exit);
  });
});
