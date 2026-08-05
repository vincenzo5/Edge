"use client";

import { useState } from "react";
import JournalSetupsSettingsSection from "@/app/components/journal/JournalSetupsSettingsSection";
import {
  JournalTileActions,
  JournalTileTitle,
} from "@/app/components/app-workspace/JournalTileChrome";
import { useJournalTileViewOptional } from "@/app/components/app-workspace/JournalTileViewContext";
import JournalModuleHeader from "@/app/components/journal/JournalModuleHeader";
import JournalScopeBar from "@/app/components/journal/JournalScopeBar";
import JournalViewTabs from "@/app/components/journal/JournalViewTabs";
import { defaultJournalScopeState } from "@/lib/journal/journalFilterHelpers";
import {
  EMPTY_JOURNAL_FILTERS,
  type JournalFilters,
  type JournalStatsWindow,
} from "@/lib/journal/journalStats";

export default function JournalSettingsView() {
  const tileView = useJournalTileViewOptional();
  const [window, setWindow] = useState<JournalStatsWindow>(defaultJournalScopeState().window);
  const [filters, setFilters] = useState<JournalFilters>(EMPTY_JOURNAL_FILTERS);
  const scopeMode = tileView?.listView === "dashboard" ? "dashboard" : "trades";

  return (
    <>
      {tileView ? (
        <JournalModuleHeader
          sticky
          title={<JournalTileTitle />}
          leading={<JournalViewTabs />}
          trailing={<JournalTileActions />}
        >
          <JournalScopeBar
            mode={scopeMode}
            filters={filters}
            onChange={setFilters}
            window={window}
            onWindowChange={setWindow}
          />
        </JournalModuleHeader>
      ) : null}
      <main className="min-h-0 flex-1 overflow-y-auto p-4" data-testid="journal-settings-view">
        <JournalSetupsSettingsSection />
      </main>
    </>
  );
}
