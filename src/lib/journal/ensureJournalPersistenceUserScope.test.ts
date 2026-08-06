import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  JOURNAL_SESSION_USER_STORAGE_KEY,
  ensureJournalPersistenceUserScope,
} from "./ensureJournalPersistenceUserScope";
import { clearLocalJournalSnapshot, writeLocalJournalSnapshot } from "./localJournalStore";
import { invalidateJournalPersistenceCache } from "@/lib/persistence/client/persistenceClientCache";

vi.mock("@/lib/persistence/client/persistenceClientCache", () => ({
  invalidateJournalPersistenceCache: vi.fn(),
}));

describe("ensureJournalPersistenceUserScope", () => {
  beforeEach(() => {
    clearLocalJournalSnapshot();
    localStorage.removeItem(JOURNAL_SESSION_USER_STORAGE_KEY);
    vi.mocked(invalidateJournalPersistenceCache).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clears legacy unscoped local journal data on first bind", async () => {
    writeLocalJournalSnapshot({
      fills: [
        {
          execId: "legacy-fill",
          symbol: "AAPL",
          secType: "STK",
          side: "BUY",
          quantity: 1,
          price: 100,
          fillTime: "2026-01-02T15:00:00.000Z",
          account: "U25026894",
        },
      ],
      trades: [],
      updatedAt: Date.now(),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          user: { id: "demo-user-id", email: "demo@localhost" },
        }),
      ),
    );

    await expect(ensureJournalPersistenceUserScope()).resolves.toBe("demo-user-id");
    expect(localStorage.getItem(JOURNAL_SESSION_USER_STORAGE_KEY)).toBe("demo-user-id");
    expect(invalidateJournalPersistenceCache).toHaveBeenCalledTimes(1);
  });

  it("clears journal data when the signed-in user changes", async () => {
    localStorage.setItem(JOURNAL_SESSION_USER_STORAGE_KEY, "dev-user-id");
    writeLocalJournalSnapshot({
      fills: [],
      trades: [{ id: "t1", status: "closed", direction: "long", symbol: "AAPL", secType: "STK", openedAt: "2026-01-02T15:00:00.000Z", fillExecIds: ["x"] }],
      updatedAt: Date.now(),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          user: { id: "demo-user-id", email: "demo@localhost" },
        }),
      ),
    );

    await ensureJournalPersistenceUserScope();
    expect(invalidateJournalPersistenceCache).toHaveBeenCalledTimes(1);
  });
});
