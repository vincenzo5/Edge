"use client";

import { useMemo, useRef } from "react";

import JournalDashboardView from "@/app/components/journal/JournalDashboardView";
import JournalSettingsView from "@/app/components/journal/JournalSettingsView";
import JournalTradesView from "@/app/components/journal/JournalTradesView";
import { JournalSyncProvider } from "@/app/components/journal/JournalSyncProvider";
import { JournalTradesProvider } from "@/app/components/journal/JournalTradesProvider";
import type { TileSurfaceState } from "@/lib/appWorkspace/types";

import { useAppWorkspace } from "./AppWorkspaceContext";
import {
  isJournalListView,
  JournalTileViewProvider,
  type JournalListView,
  type JournalView,
} from "./JournalTileViewContext";

type Props = {
  tileId: string;
  surfaceState?: TileSurfaceState;
};

export default function JournalTileSurface({ tileId, surfaceState }: Props) {
  const { document, updateWorkspaceTileSurfaceState } = useAppWorkspace();
  const view: JournalView =
    document.tiles[tileId]?.surfaceState?.journalView ??
    surfaceState?.journalView ??
    "dashboard";

  const listViewRef = useRef<JournalListView>("dashboard");
  if (isJournalListView(view)) {
    listViewRef.current = view;
  }
  const listView = listViewRef.current;

  function setView(next: JournalView) {
    updateWorkspaceTileSurfaceState(tileId, { journalView: next });
  }

  const body = useMemo(() => {
    switch (view) {
      case "trades":
        return <JournalTradesView variant="trades" />;
      case "open":
        return <JournalTradesView variant="open" />;
      case "settings":
        return <JournalSettingsView />;
      case "dashboard":
      default:
        return <JournalDashboardView />;
    }
  }, [view]);

  return (
    <JournalSyncProvider>
      <JournalTradesProvider>
        <JournalTileViewProvider view={view} listView={listView} setView={setView}>
          <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{body}</div>
          </div>
        </JournalTileViewProvider>
      </JournalTradesProvider>
    </JournalSyncProvider>
  );
}
