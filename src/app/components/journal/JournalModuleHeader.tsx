"use client";

import type { ReactNode } from "react";

type Props = {
  children?: ReactNode;
  /** Leftmost label (e.g. Journal title button). */
  title?: ReactNode;
  /** Nav after title (e.g. Dashboard / Trades / Open Positions tabs). */
  leading?: ReactNode;
  /** Far-right utilities (e.g. sync / import / settings). */
  trailing?: ReactNode;
  sticky?: boolean;
};

/**
 * Single-row journal chrome:
 * `[ title ] [ tabs ] …… [ filters ] [ actions ]`
 */
export default function JournalModuleHeader({
  children,
  title,
  leading,
  trailing,
  sticky = false,
}: Props) {
  return (
    <header
      className={`flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] px-3 py-2 min-h-12${sticky ? " sticky top-0 z-10" : ""}`}
      data-testid="journal-module-header"
    >
      {title ? <div className="shrink-0">{title}</div> : null}
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
        {children}
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
    </header>
  );
}
