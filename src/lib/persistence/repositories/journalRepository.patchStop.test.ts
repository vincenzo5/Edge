import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getJournalTradeById: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  returning: vi.fn(),
}));

vi.mock("@/db", () => ({
  getDb: () => ({
    select: mocks.select,
    update: mocks.update,
  }),
}));

vi.mock("@/lib/persistence/repositories/journalIngestRepository", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/persistence/repositories/journalIngestRepository")
  >("@/lib/persistence/repositories/journalIngestRepository");
  return {
    ...actual,
    getJournalTradeById: mocks.getJournalTradeById,
  };
});

import { patchJournalTrade } from "@/lib/persistence/repositories/journalRepository";

describe("patchJournalTrade initialStop on closed trades", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads open/entry fills when netQuantity is 0 so stop risk can be saved", async () => {
    mocks.getJournalTradeById.mockResolvedValueOnce({
      id: "trade-1",
      status: "closed",
      direction: "long",
      symbol: "LQDA",
      secType: "STK",
      openedAt: "2026-08-03T15:43:09.000Z",
      closedAt: "2026-08-05T18:35:35.000Z",
      netQuantity: 0,
      avgEntry: 83.56985,
      avgExit: 89.58695,
      fillExecIds: ["exec-a", "exec-b"],
      tags: [],
      setup: null,
      reviewNote: null,
      plannedRiskMode: null,
      plannedRiskValue: null,
      plannedRiskUsd: null,
      initialStop: null,
      rating: null,
      ignored: false,
      legs: null,
      managePlaybook: null,
      createdAt: "2026-08-06T15:00:00.000Z",
      updatedAt: "2026-08-06T15:00:00.000Z",
    });

    const fillSelectWhere = vi.fn().mockResolvedValue([
      { execId: "exec-a", quantity: 200, side: "BOT", role: "open" },
      { execId: "exec-b", quantity: 200, side: "SLD", role: "close" },
    ]);
    mocks.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: fillSelectWhere,
        }),
      }),
    });

    const updatedAt = new Date("2026-08-06T15:30:00.000Z");
    mocks.returning.mockResolvedValueOnce([
      {
        id: "trade-1",
        userId: "user-1",
        status: "closed",
        direction: "long",
        symbol: "LQDA",
        secType: "STK",
        openedAt: new Date("2026-08-03T15:43:09.000Z"),
        closedAt: new Date("2026-08-05T18:35:35.000Z"),
        netQuantity: 0,
        avgEntry: 83.56985,
        avgExit: 89.58695,
        grossPnl: null,
        netPnl: null,
        totalCommission: null,
        legs: null,
        tags: [],
        setup: null,
        reviewNote: null,
        plannedRiskMode: "usd",
        plannedRiskValue: 713.97,
        plannedRiskUsd: 713.97,
        initialStop: 80,
        rating: null,
        ignored: false,
        mfeUsd: null,
        mfaUsd: null,
        excursionInterval: null,
        excursionComputedAt: null,
        managePlaybook: null,
        riskPolicyInstanceId: null,
        createdAt: new Date("2026-08-06T15:00:00.000Z"),
        updatedAt,
      },
    ]);
    mocks.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: mocks.returning,
        }),
      }),
    });

    const result = await patchJournalTrade("user-1", "trade-1", { initialStop: 80 });

    expect(fillSelectWhere).toHaveBeenCalled();
    expect(result?.initialStop).toBe(80);
    expect(result?.plannedRiskMode).toBe("usd");
    expect(result?.plannedRiskUsd).toBeCloseTo(713.97, 2);
  });
});
