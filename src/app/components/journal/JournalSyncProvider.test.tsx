import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          results: [{ connectionId: "ib-paper", skipped: false, added: 0, duplicates: 1 }],
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

  it("does not bump lastSyncedAt on no-op ingest", async () => {
    const { getByTestId } = render(
      <JournalSyncProvider>
        <SyncProbe />
      </JournalSyncProvider>,
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    expect(getByTestId("journal-sync-probe").getAttribute("data-last-synced-at")).toBe("none");
  });

  it("bumps lastSyncedAt when ingest adds fills", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({
        results: [{ connectionId: "ib-paper", skipped: false, added: 2, duplicates: 0 }],
      }),
    );

    const { getByTestId } = render(
      <JournalSyncProvider>
        <SyncProbe />
      </JournalSyncProvider>,
    );

    await waitFor(() => {
      expect(getByTestId("journal-sync-probe").getAttribute("data-last-synced-at")).not.toBe(
        "none",
      );
    });
  });

  it("skips interval ingest while document is hidden", async () => {
    vi.useFakeTimers();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });

    render(
      <JournalSyncProvider>
        <SyncProbe />
      </JournalSyncProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
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
