"use client";

import Tooltip from "@/app/components/Tooltip";
import EdgeSpinner from "@/app/components/design-system/EdgeSpinner";
import { useJournalSync } from "@/app/components/journal/JournalSyncProvider";
import { useJournalHistoryOutOfSync } from "@/app/components/journal/useJournalHistoryOutOfSync";

const HISTORY_SYNC_HELP =
  "Journal trade history is out of sync with your live account. Sync is running automatically; history backfill may take a few minutes when Flex is configured.";

export default function JournalHistorySyncChip() {
  const outOfSync = useJournalHistoryOutOfSync();
  const { syncing } = useJournalSync();

  if (!outOfSync) return null;

  const label = syncing ? "Catching up" : "History lagging";

  return (
    <Tooltip content={HISTORY_SYNC_HELP} theme="dark" side="bottom" portaled>
      <span
        data-testid="journal-history-sync-chip"
        role="status"
        aria-live="polite"
        className="inline-flex cursor-help items-center gap-1 rounded-full border border-[var(--edge-warning-border)] bg-[var(--edge-warning-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--edge-text-primary)]"
      >
        {syncing ? (
          <EdgeSpinner size="xs" data-testid="journal-history-sync-chip-spinner" />
        ) : null}
        {label}
      </span>
    </Tooltip>
  );
}
