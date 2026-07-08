"use client";

import type { ReactNode } from "react";
import JournalImportDialog from "@/app/components/journal/JournalImportDialog";
import { useJournalSync } from "@/app/components/journal/JournalSyncProvider";

type Props = {
  title: string;
  showActions?: boolean;
  onImported?: () => void;
  children?: ReactNode;
  sticky?: boolean;
};

export default function JournalModuleHeader({
  title,
  showActions = true,
  onImported,
  children,
  sticky = false,
}: Props) {
  const { syncing, syncNow } = useJournalSync();
  const hasTrailing = children != null || showActions;

  return (
    <header
      className={`flex shrink-0 items-center justify-between gap-4 border-b border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] px-4 py-2${hasTrailing ? " min-h-12" : " h-12"}${sticky ? " sticky top-0 z-10" : ""}`}
    >
      <h1 className="shrink-0 text-sm font-semibold text-[var(--edge-text-strong)]">{title}</h1>
      <div className="flex min-w-0 flex-1 flex-wrap items-end justify-end gap-2">
        {children}
        {showActions ? (
          <>
            <button
              type="button"
              className="text-xs text-[var(--edge-accent-blue)] hover:underline"
              onClick={() => void syncNow()}
            >
              {syncing ? "Syncing…" : "Sync fills"}
            </button>
            <JournalImportDialog onImported={() => onImported?.()} />
          </>
        ) : null}
      </div>
    </header>
  );
}
