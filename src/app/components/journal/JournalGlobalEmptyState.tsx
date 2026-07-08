"use client";

import { EdgeEmptyState } from "@/app/components/design-system";
import JournalImportDialog from "@/app/components/journal/JournalImportDialog";
import { useJournalSync } from "@/app/components/journal/JournalSyncProvider";
import { JOURNAL_GLOBAL_EMPTY_MESSAGE } from "@/lib/journal/journalEmptyCopy";

type Props = {
  onImported?: () => void;
};

export default function JournalGlobalEmptyState({ onImported }: Props) {
  const { syncing, syncNow } = useJournalSync();

  return (
    <div data-testid="journal-global-empty">
      <EdgeEmptyState
        message={JOURNAL_GLOBAL_EMPTY_MESSAGE}
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="text-xs text-[var(--edge-accent-blue)] hover:underline"
              onClick={() => void syncNow()}
            >
              {syncing ? "Syncing…" : "Sync fills"}
            </button>
            <JournalImportDialog onImported={() => onImported?.()} />
          </div>
        }
      />
    </div>
  );
}
