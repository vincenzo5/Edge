"use client";

import Link from "next/link";
import { recordLastModule } from "@/lib/app/lastModule";
import { panelTitleClass } from "../design-system/styles";

const MODULES = [
  {
    module: "copilot" as const,
    href: "/copilot",
    title: "Talk",
    description: "Ask Copilot and build research with AI-first conversation.",
    testId: "home-hub-copilot",
  },
  {
    module: "research" as const,
    href: "/research",
    title: "Board",
    description: "Open the research board shell — spatial cards arrive in a later phase.",
    testId: "home-hub-research",
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
