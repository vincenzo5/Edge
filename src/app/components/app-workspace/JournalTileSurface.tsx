"use client";

import { useMemo } from "react";

import JournalDashboardView from "@/app/components/journal/JournalDashboardView";
import JournalSettingsView from "@/app/components/journal/JournalSettingsView";
import JournalSubNav from "@/app/components/journal/JournalSubNav";
import JournalTradesView from "@/app/components/journal/JournalTradesView";
import { JournalSyncProvider } from "@/app/components/journal/JournalSyncProvider";
import { JournalTradesProvider } from "@/app/components/journal/JournalTradesProvider";
import type { TileSurfaceState } from "@/lib/appWorkspace/types";

type Props = {
  surfaceState?: TileSurfaceState;
};

export default function JournalTileSurface({ surfaceState }: Props) {
  const view = surfaceState?.journalView ?? "dashboard";

  const body = useMemo(() => {
    switch (view) {
      case "trades":
        return <JournalTradesView />;
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
        <div className="flex h-full min-h-0 min-w-0">
          <JournalSubNav />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{body}</div>
        </div>
      </JournalTradesProvider>
    </JournalSyncProvider>
  );
}
