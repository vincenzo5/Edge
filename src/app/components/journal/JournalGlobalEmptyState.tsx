"use client";

import { SyncIcon } from "@/app/components/chart-chrome/ChartHeaderIcons";
import { EdgeEmptyState, EdgeIconButton, EdgeSpinner } from "@/app/components/design-system";
import Tooltip from "@/app/components/Tooltip";
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
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Tooltip
              content={syncing ? "Syncing fills…" : "Sync fills"}
              theme="dark"
              side="bottom"
              portaled
            >
              <EdgeIconButton
                aria-label={syncing ? "Syncing fills" : "Sync fills"}
                aria-busy={syncing || undefined}
                data-testid="journal-sync-fills"
                disabled={syncing}
                onClick={() => void syncNow()}
              >
                {syncing ? <EdgeSpinner size="sm" /> : <SyncIcon size={16} />}
              </EdgeIconButton>
            </Tooltip>
            <JournalImportDialog onImported={() => onImported?.()} />
          </div>
        }
      />
    </div>
  );
}
