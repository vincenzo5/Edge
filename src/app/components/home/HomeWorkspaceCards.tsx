"use client";

import Link from "next/link";
import type { HomeLayoutMode } from "@/lib/app/homeLayout";
import type { HomeWorkspaceSummary } from "@/lib/app/buildHomeWorkspaceSummaries";

type Props = {
  summaries: HomeWorkspaceSummary[];
  layoutMode: HomeLayoutMode;
};

function gridClassForMode(mode: HomeLayoutMode): string {
  if (mode === "tri-pane" || mode === "dual-stack") {
    return "grid grid-cols-3 gap-3";
  }
  if (mode === "dual-tabbed" || mode === "main-drawer") {
    return "grid grid-cols-2 gap-3";
  }
  return "grid grid-cols-1 gap-2";
}

export default function HomeWorkspaceCards({ summaries, layoutMode }: Props) {
  if (summaries.length === 0) {
    return null;
  }

  return (
    <section data-testid="home-workspace-cards">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--edge-text-muted)]">
        Recent workspaces
      </h2>
      <div className={gridClassForMode(layoutMode)}>
        {summaries.map((summary) => (
          <Link
            key={summary.id}
            href="/chart"
            data-testid={`home-workspace-card-${summary.id}`}
            className={`rounded-[var(--edge-radius-md)] border p-3 transition-colors hover:bg-[var(--edge-surface-hover)] ${
              summary.isActive
                ? "border-[var(--edge-border-strong)] bg-[var(--edge-surface-hover)]"
                : "border-[var(--edge-border)] bg-[var(--edge-surface-panel)]"
            }`}
          >
            <p className="text-sm font-semibold text-[var(--edge-text-strong)]">{summary.title}</p>
            <p className="mt-1 text-xs text-[var(--edge-text-secondary)]">
              {summary.symbol} · {summary.layoutId.replace(/^n/, "").replace(/-/g, " ")}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
