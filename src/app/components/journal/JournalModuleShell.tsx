"use client";

import type { ReactNode } from "react";
import AppModuleShell from "@/app/components/home/AppModuleShell";
import ModuleRouteTracker from "@/app/components/home/ModuleRouteTracker";
import JournalSubNav from "@/app/components/journal/JournalSubNav";
import { JournalSyncProvider } from "@/app/components/journal/JournalSyncProvider";
import { JournalTradesProvider } from "@/app/components/journal/JournalTradesProvider";

type Props = {
  children: ReactNode;
};

export default function JournalModuleShell({ children }: Props) {
  return (
    <AppModuleShell testId="journal-page">
      <JournalSyncProvider>
        <JournalTradesProvider>
          <ModuleRouteTracker module="journal" />
          <div className="flex min-h-0 min-w-0 flex-1">
            <JournalSubNav />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
          </div>
        </JournalTradesProvider>
      </JournalSyncProvider>
    </AppModuleShell>
  );
}
