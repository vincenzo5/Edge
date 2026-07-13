"use client";

import { collectFilterSummaries, type RuleGroup } from "@/lib/screener/compileQuery";

type Props = {
  root: RuleGroup;
};

export default function FilterChipSummary({ root }: Props) {
  const summaries = collectFilterSummaries(root);

  if (summaries.length === 0) {
    return (
      <p
        className="text-xs text-[var(--edge-text-secondary)]"
        data-testid="screener-filter-summary-empty"
      >
        No custom rules yet. Add a filter or pick a preset.
      </p>
    );
  }

  return (
    <div
      className="flex flex-wrap gap-1.5"
      data-testid="screener-filter-chip-summary"
    >
      {summaries.map((summary, index) => (
        <span
          key={`${summary}-${index}`}
          className="rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-panel)] px-2 py-0.5 text-xs text-[var(--edge-text-primary)]"
        >
          {summary}
        </span>
      ))}
    </div>
  );
}
