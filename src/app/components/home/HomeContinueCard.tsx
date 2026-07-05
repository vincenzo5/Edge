"use client";

import Link from "next/link";
import type { HomeWorkspaceSummary } from "@/lib/app/buildHomeWorkspaceSummaries";
import { EdgeButton } from "../design-system";

type Props = {
  summary: HomeWorkspaceSummary | null;
  loaded: boolean;
};

export default function HomeContinueCard({ summary, loaded }: Props) {
  if (!loaded) {
    return (
      <section
        data-testid="home-continue-card"
        className="rounded-[var(--edge-radius-md)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-4"
      >
        <p className="text-sm text-[var(--edge-text-muted)]">Loading workspace…</p>
      </section>
    );
  }

  if (!summary) {
    return (
      <section
        data-testid="home-continue-card"
        className="rounded-[var(--edge-radius-md)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-4"
      >
        <h2 className="text-sm font-semibold text-[var(--edge-text-strong)]">Continue</h2>
        <p className="mt-2 text-sm text-[var(--edge-text-secondary)]">No workspace found.</p>
        <Link href="/chart" className="mt-4 inline-block">
          <EdgeButton variant="primary">Open charts</EdgeButton>
        </Link>
      </section>
    );
  }

  return (
    <section
      data-testid="home-continue-card"
      className="rounded-[var(--edge-radius-md)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-4"
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--edge-text-muted)]">
        Continue
      </h2>
      <p className="mt-2 text-base font-semibold text-[var(--edge-text-strong)]">
        {summary.title}
      </p>
      <p className="mt-1 text-sm text-[var(--edge-text-secondary)]">
        {summary.symbol} · {summary.layoutId.replace(/^n/, "").replace(/-/g, " ")}
      </p>
      <Link href="/chart" className="mt-4 inline-block" data-testid="home-continue-open">
        <EdgeButton variant="primary">Open charts</EdgeButton>
      </Link>
    </section>
  );
}
