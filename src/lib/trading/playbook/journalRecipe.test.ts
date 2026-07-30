import { describe, expect, it, vi, beforeEach } from "vitest";

import { BREAK_EVEN_PRESET } from "./presets";
import { buildManagePlaybookJournal, syncManagePlaybookToJournal } from "./journalRecipe";
import { createPlaybookInstance, lockPositionPlan } from "./types";

const journalMocks = vi.hoisted(() => ({
  listJournalFills: vi.fn(),
  listJournalTrades: vi.fn(),
  patchJournalTrade: vi.fn(),
  patchJournalTradeManagePlaybook: vi.fn(),
  findTradeForOrderRef: vi.fn(),
}));

vi.mock("@/lib/journal/correlateOrderRef", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/journal/correlateOrderRef")>();
  return {
    ...actual,
    findTradeForOrderRef: journalMocks.findTradeForOrderRef,
  };
});

vi.mock("@/lib/persistence/repositories/journalRepository", () => ({
  listJournalFills: journalMocks.listJournalFills,
  listJournalTrades: journalMocks.listJournalTrades,
  patchJournalTrade: journalMocks.patchJournalTrade,
  patchJournalTradeManagePlaybook: journalMocks.patchJournalTradeManagePlaybook,
}));

function makeInstance() {
  const plan = lockPositionPlan({
    symbol: "AAPL",
    accountId: "DUP586813",
    side: "BUY",
    entry: 100,
    initialStop: 95,
    qty: 10,
    environment: "paper",
  });
  const instance = createPlaybookInstance({
    id: "inst-1",
    template: BREAK_EVEN_PRESET,
    positionPlan: plan,
    status: "armed",
    orderRef: "edge-intent-intent-1",
  });
  instance.ruleRuntimes = instance.ruleRuntimes.map((item) =>
    item.ruleId === "be-at-1r"
      ? { ...item, status: "fired", firedAt: "2026-07-24T12:00:00.000Z" }
      : item,
  );
  return instance;
}

describe("buildManagePlaybookJournal", () => {
  it("builds adherence counts, timeline, and geometry snapshot from instance", () => {
    const recipe = buildManagePlaybookJournal(makeInstance());
    expect(recipe.templateName).toBe("Break-even");
    expect(recipe.plannedRuleCount).toBe(1);
    expect(recipe.firedRuleCount).toBe(1);
    expect(recipe.ruleTimeline[0]?.status).toBe("fired");
    expect(recipe.positionPlan).toEqual({
      entry: 100,
      initialStop: 95,
      qty: 10,
      rUnit: 5,
      side: "BUY",
    });
    expect(recipe.protectSummary).toBe("Stop @ 95");
  });
});

describe("syncManagePlaybookToJournal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    journalMocks.listJournalFills.mockResolvedValue([]);
    journalMocks.listJournalTrades.mockResolvedValue([]);
    journalMocks.patchJournalTrade.mockResolvedValue(null);
    journalMocks.patchJournalTradeManagePlaybook.mockResolvedValue(null);
  });

  it("fills planned risk when empty and always syncs manage recipe", async () => {
    const trade = {
      id: "trade-1",
      plannedRiskMode: null,
      plannedRiskValue: null,
      plannedRiskUsd: null,
      fillExecIds: [],
    };
    journalMocks.findTradeForOrderRef.mockReturnValue(trade);

    await syncManagePlaybookToJournal("user-1", makeInstance());

    expect(journalMocks.patchJournalTrade).toHaveBeenCalledWith("user-1", "trade-1", {
      plannedRiskMode: "usd",
      plannedRiskValue: 50,
    });
    expect(journalMocks.patchJournalTradeManagePlaybook).toHaveBeenCalledWith(
      "user-1",
      "trade-1",
      expect.objectContaining({
        templateId: "break_even",
        positionPlan: expect.objectContaining({ entry: 100, initialStop: 95 }),
        protectSummary: "Stop @ 95",
      }),
    );
  });

  it("does not overwrite existing planned risk", async () => {
    journalMocks.findTradeForOrderRef.mockReturnValue({
      id: "trade-1",
      plannedRiskMode: "usd",
      plannedRiskValue: 75,
      plannedRiskUsd: 75,
      fillExecIds: [],
    });

    await syncManagePlaybookToJournal("user-1", makeInstance());

    expect(journalMocks.patchJournalTrade).not.toHaveBeenCalled();
    expect(journalMocks.patchJournalTradeManagePlaybook).toHaveBeenCalled();
  });
});
