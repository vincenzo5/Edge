import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchJournalTradeById: vi.fn(),
  fetchJournalProviderTrades: vi.fn(),
  invalidateJournalPersistenceCache: vi.fn(),
  readLocalJournalSnapshot: vi.fn(() => ({ fills: [], trades: [] })),
}));

vi.mock("@/lib/persistence/client/journalClient", () => ({
  fetchJournalTradeById: mocks.fetchJournalTradeById,
  fetchJournalProviderTrades: mocks.fetchJournalProviderTrades,
  invalidateJournalPersistenceCache: mocks.invalidateJournalPersistenceCache,
}));

vi.mock("@/lib/journal/localJournalStore", () => ({
  readLocalJournalSnapshot: mocks.readLocalJournalSnapshot,
}));

import { resolveJournalTradeIdForPersistence } from "./resolveJournalTradeIdForPersistence";

describe("resolveJournalTradeIdForPersistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the trade id when the server recognizes it", async () => {
    mocks.fetchJournalTradeById.mockResolvedValueOnce({ id: "server-a" });

    await expect(
      resolveJournalTradeIdForPersistence({ tradeId: "server-a", fillExecIds: ["exec-1"] }),
    ).resolves.toBe("server-a");
    expect(mocks.invalidateJournalPersistenceCache).not.toHaveBeenCalled();
  });

  it("rematches by fillExecIds after a stale client id", async () => {
    mocks.fetchJournalTradeById.mockResolvedValueOnce(null);
    mocks.fetchJournalProviderTrades.mockResolvedValueOnce([
      { id: "server-b", fillExecIds: ["exec-2", "exec-1"] },
    ]);

    await expect(
      resolveJournalTradeIdForPersistence({
        tradeId: "stale-local",
        fillExecIds: ["exec-1", "exec-2"],
      }),
    ).resolves.toBe("server-b");
    expect(mocks.invalidateJournalPersistenceCache).toHaveBeenCalled();
  });

  it("falls back to the local mirror when provider trades are unavailable", async () => {
    mocks.fetchJournalTradeById.mockResolvedValueOnce(null);
    mocks.fetchJournalProviderTrades.mockResolvedValueOnce([]);
    mocks.readLocalJournalSnapshot.mockReturnValueOnce({
      fills: [],
      trades: [{ id: "local-c", fillExecIds: ["exec-9"] }],
    });

    await expect(
      resolveJournalTradeIdForPersistence({ tradeId: "missing", fillExecIds: ["exec-9"] }),
    ).resolves.toBe("local-c");
  });

  it("returns null when no trade can be resolved", async () => {
    mocks.fetchJournalTradeById.mockResolvedValueOnce(null);

    await expect(
      resolveJournalTradeIdForPersistence({ tradeId: "missing" }),
    ).resolves.toBeNull();
  });
});
