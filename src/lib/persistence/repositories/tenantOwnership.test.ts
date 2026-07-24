import { beforeEach, describe, expect, it, vi } from "vitest";

import { PersistenceOwnershipError } from "@/lib/persistence/common";

const mocks = vi.hoisted(() => ({
  getChartWorkspaceById: vi.fn(),
  getJournalTradeScreenshotById: vi.fn(),
  getNotificationEventById: vi.fn(),
  tradeOwned: true,
}));

vi.mock("@/lib/persistence/repositories/chartWorkspaceRepository", () => ({
  getChartWorkspaceById: mocks.getChartWorkspaceById,
}));

vi.mock("@/lib/persistence/repositories/journalScreenshotRepository", () => ({
  getJournalTradeScreenshotById: mocks.getJournalTradeScreenshotById,
}));

vi.mock("@/lib/persistence/repositories/notificationRepository", () => ({
  getNotificationEventById: mocks.getNotificationEventById,
}));

vi.mock("@/db", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => (mocks.tradeOwned ? [{ id: "trade-1" }] : []),
          orderBy: () => [],
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: () => [
          {
            id: "row-1",
            userId: "user-1",
            alertId: "alert-1",
            symbol: "AAPL",
            operator: "crosses_above",
            triggerPrice: 200,
            quotePrice: 201,
            notificationId: null,
            createdAt: new Date(),
          },
        ],
      }),
    }),
  }),
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    max: () => ({ as: () => null }),
    sql: () => null,
  };
});

import { createMarketResearchNote } from "./marketResearchNotesRepository";
import { createJournalTradeChartSnapshot } from "./journalChartSnapshotRepository";
import { createAlertTriggerEvent } from "./alertRepository";

describe("tenant ownership guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tradeOwned = true;
    mocks.getChartWorkspaceById.mockResolvedValue(null);
    mocks.getJournalTradeScreenshotById.mockResolvedValue(null);
    mocks.getNotificationEventById.mockResolvedValue(null);
  });

  it("rejects research notes linked to a foreign workspace", async () => {
    await expect(
      createMarketResearchNote({
        userId: "user-1",
        chartWorkspaceId: "ws-foreign",
        symbol: "AAPL",
        chartInterval: "1d",
        researchNoteType: "thesis",
        researchThesis: { summary: "test" },
      }),
    ).rejects.toBeInstanceOf(PersistenceOwnershipError);
    expect(mocks.getChartWorkspaceById).toHaveBeenCalledWith("user-1", "ws-foreign");
  });

  it("rejects journal snapshots linked to a foreign screenshot", async () => {
    await expect(
      createJournalTradeChartSnapshot("user-1", "trade-1", {
        cellConfig: {
          symbol: "AAPL",
          range: "1y",
          interval: "1d",
          chartType: "candle_solid",
          indicators: [],
          drawings: [],
        },
        screenshotId: "shot-foreign",
      }),
    ).rejects.toBeInstanceOf(PersistenceOwnershipError);
    expect(mocks.getJournalTradeScreenshotById).toHaveBeenCalledWith(
      "user-1",
      "trade-1",
      "shot-foreign",
    );
  });

  it("rejects alert trigger events linked to a foreign notification", async () => {
    await expect(
      createAlertTriggerEvent({
        userId: "user-1",
        alertId: "alert-1",
        symbol: "AAPL",
        operator: "crosses_above",
        triggerPrice: 200,
        quotePrice: 201,
        notificationId: "notif-foreign",
      }),
    ).rejects.toBeInstanceOf(PersistenceOwnershipError);
    expect(mocks.getNotificationEventById).toHaveBeenCalledWith("user-1", "notif-foreign");
  });
});
