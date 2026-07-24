"use client";

import { EdgeUnderlineTabs } from "@/app/components/design-system";
import {
  useJournalTileViewOptional,
  type JournalListView,
} from "@/app/components/app-workspace/JournalTileViewContext";

const JOURNAL_VIEW_TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "trades", label: "Trades" },
  { id: "open", label: "Open Positions" },
] as const;

export default function JournalViewTabs() {
  const ctx = useJournalTileViewOptional();
  if (!ctx) return null;

  const { listView, setView } = ctx;

  return (
    <EdgeUnderlineTabs
      segments={[...JOURNAL_VIEW_TABS]}
      value={listView}
      onChange={(id) => setView(id as JournalListView)}
    />
  );
}
