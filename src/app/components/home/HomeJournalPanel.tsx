"use client";

import Link from "next/link";
import { EdgeEmptyState, EdgePanelHeader } from "../design-system";

export default function HomeJournalPanel() {
  return (
    <section
      data-testid="home-journal-panel"
      className="flex min-h-0 flex-col rounded-[var(--edge-radius-md)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)]"
    >
      <EdgePanelHeader title="Journal" />
      <div className="flex min-h-0 flex-1 flex-col">
        <EdgeEmptyState
          message="Trading journal is coming soon. Review and log trades in one place."
          action={
            <Link
              href="/journal"
              data-testid="home-journal-open"
              className="text-sm text-[var(--edge-accent-blue)] hover:underline"
            >
              Learn more
            </Link>
          }
        />
      </div>
    </section>
  );
}
