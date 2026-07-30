"use client";

import type { OpenPositionExitsSummary } from "@/lib/trading/summarizeOpenPositionExits";
import { openPositionExitWarningLabel } from "@/lib/trading/summarizeOpenPositionExits";
import { metadataTextClass } from "@/app/components/design-system/styles";

type Props = {
  summary: OpenPositionExitsSummary;
  symbol: string;
  onProtect?: () => void;
  compact?: boolean;
};

export function OpenPositionExitsStrip({ summary, symbol, onProtect, compact = false }: Props) {
  const unprotected = summary.warnings.includes("unprotected");

  return (
    <div
      className={compact ? "space-y-0.5" : "space-y-1"}
      data-testid={`open-position-exits-${symbol}`}
    >
      <div
        className={`${metadataTextClass()} ${
          unprotected
            ? "text-[var(--edge-warning)]"
            : "text-[var(--edge-text-secondary)]"
        }`}
        data-testid={`open-position-protect-${symbol}`}
      >
        Protect: {summary.protect.label}
      </div>

      {summary.manage.attached ? (
        <>
          <div
            className={`${metadataTextClass()} text-[var(--edge-accent-blue)]`}
            data-testid={`open-position-manage-${symbol}`}
          >
            {summary.manage.label}
          </div>
          {summary.manage.pauseMessage ? (
            <div
              className={`${metadataTextClass()} text-[var(--edge-warning)]`}
              data-testid={`open-position-manage-pause-${symbol}`}
            >
              {summary.manage.pauseMessage}
            </div>
          ) : null}
          {summary.manage.completedLabels.length > 0 ? (
            <div
              className={`${metadataTextClass()} text-[var(--edge-text-secondary)]`}
              data-testid={`open-position-manage-done-${symbol}`}
            >
              Done: {summary.manage.completedLabels.join(", ")}
            </div>
          ) : null}
          {summary.manage.nextDistance || summary.manage.nextActionPreview ? (
            <div
              className={`${metadataTextClass()} text-[var(--edge-text-secondary)]`}
              data-testid={`open-position-manage-next-${symbol}`}
            >
              {[summary.manage.nextDistance, summary.manage.nextActionPreview]
                .filter(Boolean)
                .join(" · ")}
            </div>
          ) : null}
        </>
      ) : null}

      {unprotected ? (
        <div className="space-y-1">
          <p
            className={`${metadataTextClass()} text-[var(--edge-warning)]`}
            data-testid={`open-position-unprotected-${symbol}`}
          >
            {openPositionExitWarningLabel("unprotected")}
          </p>
          {onProtect ? (
            <button
              type="button"
              className={`${metadataTextClass()} text-[var(--edge-accent-blue)] underline-offset-2 hover:underline`}
              data-testid={`open-position-protect-action-${symbol}`}
              onClick={(event) => {
                event.stopPropagation();
                onProtect();
              }}
            >
              Protect with OCO…
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
