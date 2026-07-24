import { beforeEach, describe, expect, it, vi } from "vitest";

import { adoptServerJournalTrades } from "@/lib/journal/adoptServerJournalTrades";
import { clearLocalJournalSnapshot, readLocalJournalSnapshot } from "@/lib/journal/localJournalStore";
import type { JournalTrade } from "@/lib/journal/types";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

const persistenceFetch = vi.fn();

vi.mock("@/lib/persistence/client/persistenceFetch", () => ({
  persistenceFetch: (...args: unknown[]) => persistenceFetch(...args),
}));

vi.mock("@/lib/journal/localScreenshotStore", () => ({
  migrateLocalJournalTradeScreenshots: vi.fn(async () => 0),
}));

vi.mock("@/lib/journal/localChartSnapshotStore", () => ({
  migrateLocalJournalTradeChartSnapshots: vi.fn(async () => 0),
}));

const serverTrade = (
  partial: Partial<JournalTradeResponse> & Pick<JournalTradeResponse, "id" | "fillExecIds">,
): JournalTradeResponse => ({
  status: "open",
  direction: "long",
  symbol: "BRUN",
  secType: "STK",
  openedAt: "2026-07-20T13:31:00.000Z",
  closedAt: null,
  fillExecIds: partial.fillExecIds,
  tags: [],
  setup: null,
  reviewNote: null,
  createdAt: "2026-07-20T13:31:00.000Z",
  updatedAt: "2026-07-20T13:31:00.000Z",
  ...partial,
});

const localTrade = (
  partial: Partial<JournalTrade> & Pick<JournalTrade, "id" | "fillExecIds">,
): JournalTrade => ({
  status: "open",
  direction: "long",
  symbol: "BRUN",
  secType: "STK",
  openedAt: "2026-07-20T13:31:00.000Z",
  fillExecIds: partial.fillExecIds,
  ...partial,
});

describe("adoptServerJournalTrades", () => {
  beforeEach(() => {
    clearLocalJournalSnapshot();
    persistenceFetch.mockReset();
  });

  it("mirrors server trade ids into local storage", async () => {
    const adopted = await adoptServerJournalTrades(
      [serverTrade({ id: "server-brun", fillExecIds: ["exec-1"] })],
      [localTrade({ id: "local-brun", fillExecIds: ["exec-1"] })],
    );

    expect(adopted[0]?.id).toBe("server-brun");
    expect(readLocalJournalSnapshot().trades[0]?.id).toBe("server-brun");
  });

  it("patches local-only review metadata onto the server trade", async () => {
    persistenceFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "server-brun",
          reviewNote: "Local setup note",
        }),
        { status: 200 },
      ),
    );

    const adopted = await adoptServerJournalTrades(
      [serverTrade({ id: "server-brun", fillExecIds: ["exec-1"] })],
      [
        localTrade({
          id: "local-brun",
          fillExecIds: ["exec-1"],
          reviewNote: "Local setup note",
        }),
      ],
    );

    expect(persistenceFetch).toHaveBeenCalledWith("/api/me/journal/trades/server-brun", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewNote: "Local setup note" }),
    });
    expect(adopted[0]?.reviewNote).toBe("Local setup note");
  });
});
