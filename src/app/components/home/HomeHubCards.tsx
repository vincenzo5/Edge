"use client";

import Link from "next/link";
import { recordLastModule } from "@/lib/app/lastModule";

const MODULES = [
  {
    module: "chart" as const,
    href: "/chart",
    title: "Charts",
    description: "Multi-pane workspaces, drawings, and market data.",
    testId: "home-hub-chart",
  },
  {
    module: "journal" as const,
    href: "/journal",
    title: "Journal",
    description: "Log and review trades — coming soon.",
    testId: "home-hub-journal",
  },
  {
    module: "research" as const,
    href: "/research",
    title: "Research",
    description: "Thesis notes linked to symbols and charts.",
    testId: "home-hub-research",
  },
];

export default function HomeHubCards() {
  return (
    <section data-testid="home-hub-cards">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--edge-text-muted)]">
        Modules
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MODULES.map((item) => (
          <Link
            key={item.module}
            href={item.href}
            data-testid={item.testId}
            onClick={() => recordLastModule(item.module)}
            className="rounded-[var(--edge-radius-md)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-4 transition-colors hover:bg-[var(--edge-surface-hover)]"
          >
            <p className="text-sm font-semibold text-[var(--edge-text-strong)]">{item.title}</p>
            <p className="mt-1 text-sm text-[var(--edge-text-secondary)]">{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
