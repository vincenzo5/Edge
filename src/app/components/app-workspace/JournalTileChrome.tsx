"use client";

import EdgeIconButton from "@/app/components/design-system/EdgeIconButton";
import EdgeSpinner from "@/app/components/design-system/EdgeSpinner";
import { SettingsIcon, SyncIcon } from "@/app/components/chart-chrome/ChartHeaderIcons";
import Tooltip from "@/app/components/Tooltip";
import JournalImportDialog from "@/app/components/journal/JournalImportDialog";
import JournalHistorySyncChip from "@/app/components/journal/JournalHistorySyncChip";
import { useJournalSync } from "@/app/components/journal/JournalSyncProvider";
import { useJournalTrades } from "@/app/components/journal/JournalTradesProvider";
import { useJournalTileView } from "@/app/components/app-workspace/JournalTileViewContext";

/** Clickable Journal title — returns to dashboard (e.g. from settings). */
export function JournalTileTitle() {
  const { setView } = useJournalTileView();

  return (
    <button
      type="button"
      className="text-sm font-semibold text-[var(--edge-text-strong)] hover:text-[var(--edge-text)]"
      data-testid="journal-title"
      aria-label="Back to journal dashboard"
      onClick={() => setView("dashboard")}
    >
      Journal
    </button>
  );
}

/** Sync / import / settings icon cluster for the journal tile header. */
export function JournalTileActions() {
  const { view, listView, setView } = useJournalTileView();
  const { syncing, syncNow } = useJournalSync();
  const { loadTrades } = useJournalTrades();

  return (
    <div className="flex flex-wrap items-center gap-1" data-testid="journal-tile-actions">
      <JournalHistorySyncChip />
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
      <JournalImportDialog onImported={() => void loadTrades()} />
      <EdgeIconButton
        aria-label="Journal settings"
        active={view === "settings"}
        data-testid="journal-settings-button"
        aria-pressed={view === "settings"}
        onClick={() => setView(view === "settings" ? listView : "settings")}
      >
        <SettingsIcon size={16} />
      </EdgeIconButton>
    </div>
  );
}
