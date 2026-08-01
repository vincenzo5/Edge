"use client";

import type { SubmitRiskPlanSummary as SubmitRiskPlanSummaryType } from "@/lib/risk/summarizeSubmitRiskPlan";
import { submitRiskWarningLabel } from "@/lib/risk/summarizeSubmitRiskPlan";

type Props = {
  summary: SubmitRiskPlanSummaryType;
  /** When true, show manage step previews below the slot rows. */
  manageSteps?: string[];
  compact?: boolean;
};

export function SubmitRiskPlanSummary({ summary, manageSteps, compact = false }: Props) {
  return (
    <section
      data-testid="submit-risk-plan-summary"
      className={`space-y-2 rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] ${
        compact ? "px-2 py-1.5" : "px-2 py-2"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
        Risk plan
      </div>

      <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
        <div>
          <dt className="text-[var(--edge-text-muted)]">Budget</dt>
          <dd
            data-testid="submit-risk-plan-budget"
            className="text-[var(--edge-text-primary)]"
          >
            {summary.budget.label}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--edge-text-muted)]">Size</dt>
          <dd
            data-testid="submit-risk-plan-size"
            className="text-[var(--edge-text-primary)]"
          >
            {summary.size.label}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--edge-text-muted)]">Bracket</dt>
          <dd
            data-testid="submit-risk-plan-protect"
            className="text-[var(--edge-text-primary)]"
          >
            {summary.protect.label}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--edge-text-muted)]">Manage</dt>
          <dd
            data-testid="submit-risk-plan-manage"
            className="text-[var(--edge-text-primary)]"
          >
            {summary.manage.label}
          </dd>
        </div>
      </dl>

      {manageSteps && manageSteps.length > 0 ? (
        <ul
          data-testid="submit-risk-plan-manage-steps"
          className="space-y-0.5 text-[10px] text-[var(--edge-text-secondary)]"
        >
          {manageSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      ) : null}

      {summary.warnings.length > 0 ? (
        <ul
          data-testid="submit-risk-plan-warnings"
          className="space-y-0.5 text-[10px] text-[var(--edge-warning)]"
        >
          {summary.warnings.map((warning) => (
            <li key={warning}>{submitRiskWarningLabel(warning)}</li>
          ))}
        </ul>
      ) : null}

      {summary.failureMode ? (
        <p
          data-testid="submit-risk-plan-failure-mode"
          className="text-[10px] text-[var(--edge-text-muted)]"
        >
          {summary.failureMode}
        </p>
      ) : null}

      {summary.gapGuidance ? (
        <p
          data-testid="submit-risk-plan-gap-guidance"
          className="text-[10px] text-[var(--edge-text-muted)]"
        >
          {summary.gapGuidance}
        </p>
      ) : null}
    </section>
  );
}
