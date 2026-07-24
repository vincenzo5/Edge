"use client";

import Link from "next/link";
import { recordLastModule } from "@/lib/app/lastModule";
import { panelTitleClass } from "../design-system/styles";

const MODULES = [
  {
    module: "research" as const,
    href: "/research",
    title: "Research Session",
    description: "Build a spatial thesis board from charts, screener hits, and pinned evidence.",
    testId: "home-hub-research",
  },
  {
    module: "copilot" as const,
    href: "/copilot",
    title: "Talk",
    description: "Ask Copilot and pin artifacts to your research session.",
    testId: "home-hub-copilot",
  },
  {
    module: "workspace" as const,
    href: "/workspace",
    title: "Desk",
    description: "Multi-pane tiled workspace for dense charting and execution.",
    testId: "home-hub-desk",
  },
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
    module: "screener" as const,
    href: "/screener",
    title: "Screener",
    description: "Run screens and review results in a dedicated workflow.",
    testId: "home-hub-screener",
  },
];

export default function HomeHubCards() {
  return (
    <section data-testid="home-hub-cards">
      <h2 className={`mb-3 ${panelTitleClass()} uppercase tracking-wide`}>Modules</h2>
      <p className="mb-3 text-sm text-[var(--edge-text-secondary)]">
        Talk → pin → Board → Desk when needed
      </p>
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
