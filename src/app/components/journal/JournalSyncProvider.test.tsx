import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const upsertJournalFillsRemote = vi.fn(async () => ({
  fills: [],
  imported: 0,
  duplicates: 0,
  tradesRebuilt: 0,
}));

vi.mock("@/lib/persistence/client/journalClient", () => ({
  upsertJournalFillsRemote: (...args: unknown[]) => upsertJournalFillsRemote(...args),
}));

vi.mock("@/app/components/AccountProvider", () => ({
  useAccountOptional: vi.fn(() => null),
}));

import { useAccountOptional } from "@/app/components/AccountProvider";
import { clearLocalJournalSnapshot } from "@/lib/journal/localJournalStore";
import { JournalSyncProvider, useJournalSync } from "./JournalSyncProvider";

function SyncProbe() {
  const { syncing, lastSyncedAt } = useJournalSync();
  return (
    <div
      data-testid="journal-sync-probe"
      data-syncing={syncing ? "true" : "false"}
      data-last-synced-at={lastSyncedAt ?? "none"}
    />
  );
}

describe("JournalSyncProvider", () => {
  beforeEach(() => {
    clearLocalJournalSnapshot();
    upsertJournalFillsRemote.mockClear();
    vi.mocked(useAccountOptional).mockReturnValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          executions: [
            {
              execId: "exec-1",
              time: "20260707;133000",
              side: "BOT",
              shares: 10,
              price: 100,
              contract: { symbol: "AAPL", secType: "STK" },
            },
          ],
        }),
      ),
    );
  });

  it("syncs live executions once on mount without repeated brokerage fetches", async () => {
    render(
      <JournalSyncProvider>
        <SyncProbe />
      </JournalSyncProvider>,
    );

    await waitFor(() => {
      expect(upsertJournalFillsRemote).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/brokerage/trades", { cache: "no-store" });
  });

  it("skips upsert when account executions fingerprint is unchanged", async () => {
    vi.mocked(useAccountOptional).mockReturnValue({
      executions: [
        {
          execId: "exec-1",
          time: "20260707;133000",
          side: "BOT",
          shares: 10,
          price: 100,
          contract: { symbol: "AAPL", secType: "STK" },
        },
      ],
    } as ReturnType<typeof useAccountOptional>);

    const { rerender } = render(
      <JournalSyncProvider>
        <SyncProbe />
      </JournalSyncProvider>,
    );

    await waitFor(() => {
      expect(upsertJournalFillsRemote).toHaveBeenCalledTimes(1);
    });

    rerender(
      <JournalSyncProvider>
        <SyncProbe />
      </JournalSyncProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(upsertJournalFillsRemote).toHaveBeenCalledTimes(1);
  });
});
