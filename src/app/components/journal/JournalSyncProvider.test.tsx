import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/AccountProvider", () => ({
  useAccountOptional: vi.fn(() => null),
}));

import { useAccountOptional } from "@/app/components/AccountProvider";
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
    vi.mocked(useAccountOptional).mockReturnValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          results: [{ connectionId: "ib-paper", added: 0, duplicates: 0 }],
        }),
      ),
    );
  });

  it("triggers server ingest on mount", async () => {
    render(
      <JournalSyncProvider>
        <SyncProbe />
      </JournalSyncProvider>,
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/cron/brokerage-ingest", {
        method: "POST",
        cache: "no-store",
      });
    });
  });

  it("re-triggers server ingest when execution count changes", async () => {
    vi.mocked(useAccountOptional).mockReturnValue({
      executions: [{ execId: "exec-1", shares: 1, price: 1 }],
    } as ReturnType<typeof useAccountOptional>);

    const { rerender } = render(
      <JournalSyncProvider>
        <SyncProbe />
      </JournalSyncProvider>,
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    vi.mocked(useAccountOptional).mockReturnValue({
      executions: [
        { execId: "exec-1", shares: 1, price: 1 },
        { execId: "exec-2", shares: 1, price: 1 },
      ],
    } as ReturnType<typeof useAccountOptional>);

    rerender(
      <JournalSyncProvider>
        <SyncProbe />
      </JournalSyncProvider>,
    );

    await waitFor(() => {
      expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
