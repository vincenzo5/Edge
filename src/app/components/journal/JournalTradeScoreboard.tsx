"use client";

import type { ReactNode } from "react";
import { EdgeLabeledInput, EdgeReadout } from "@/app/components/design-system";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import type { EdgeTone } from "@/lib/design-system/edge";
import {
  deriveTradeOutcomeStatus,
  formatTradeMoney,
  formatTradePrice,
  formatTradeSharesAndNotional,
  formatNetRoi,
  outcomeToneClass,
} from "@/lib/journal/journalTradeDisplay";

type DraftRiskPreview =
  | { error: string }
  | { distance: number; riskUsd: number; r: number | null }
  | null;

type Props = {
  trade: JournalTradeResponse;
  initialStopInput: string;
  onStopChange: (value: string) => void;
  stopSeededFromPlan: boolean;
  draftRiskPreview: DraftRiskPreview;
  shareQuantity: number | null;
  pnlDisplay: string;
  outcomeLabel: string;
};

function pnlTone(value: number | null | undefined): EdgeTone | undefined {
  if (value == null || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}

function ScoreboardArrow() {
  return (
    <div
      className="hidden items-center justify-center self-center text-base text-[var(--edge-text-muted)] sm:flex"
      aria-hidden
    >
      →
    </div>
  );
}

export default function JournalTradeScoreboard({
  trade,
  initialStopInput,
  onStopChange,
  stopSeededFromPlan,
  draftRiskPreview,
  shareQuantity,
  pnlDisplay,
  outcomeLabel,
}: Props) {
  const outcomeStatus = deriveTradeOutcomeStatus(trade);
  const outcomeClass = outcomeToneClass(outcomeStatus);
  const sharesAndNotional = formatTradeSharesAndNotional(trade, shareQuantity);
  const commissionLabel =
    trade.totalCommission != null ? `Comm ${formatTradeMoney(trade.totalCommission)}` : null;
  const formattedNetRoi = formatNetRoi(trade, shareQuantity);
  const netRoiLabel =
    trade.status === "closed" && formattedNetRoi !== "—"
      ? `Net ROI ${formattedNetRoi}`
      : null;

  function renderCommissionAndRoiInline() {
    if (!commissionLabel && !netRoiLabel) return null;
    return (
      <>
        {" · "}
        <span className="tabular-nums" data-testid="journal-trade-comm-roi">
          {commissionLabel ? (
            <span data-testid="journal-trade-comm">{commissionLabel}</span>
          ) : null}
          {commissionLabel && netRoiLabel ? " · " : null}
          {netRoiLabel ? <span data-testid="journal-trade-net-roi">{netRoiLabel}</span> : null}
        </span>
      </>
    );
  }

  const pnlValue: ReactNode = (
    <span className="inline-flex items-center gap-2">
      <span>{pnlDisplay}</span>
      <span
        className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${outcomeClass} bg-[color-mix(in_srgb,currentColor_12%,transparent)]`}
        data-testid="journal-trade-outcome-badge"
      >
        {outcomeLabel}
      </span>
    </span>
  );

  return (
    <section
      data-testid="journal-trade-scoreboard"
      className="shrink-0 border-b border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-5 py-3"
    >
      <section data-testid="journal-trade-risk">
        <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.1fr)] sm:gap-y-1">
          <div className="min-w-0">
            <EdgeReadout
              label="Entry"
              labelUppercase
              value={formatTradePrice(trade.avgEntry)}
              testId="journal-trade-risk-entry"
            />
          </div>
          <ScoreboardArrow />
          <div className="min-w-0">
            <EdgeLabeledInput
              label="Stop"
              type="number"
              min={0}
              step="any"
              placeholder="Set a stop to define 1R"
              value={initialStopInput}
              onChange={(event) => onStopChange(event.target.value)}
              density="compact"
              labelSurface="panel"
              testId="journal-trade-risk-stop"
            />
          </div>
          <ScoreboardArrow />
          <div className="min-w-0">
            <EdgeReadout
              label="Exit"
              labelUppercase
              value={formatTradePrice(trade.avgExit)}
              testId="journal-trade-outcome-exit"
            />
          </div>
          <ScoreboardArrow />
          <div className="min-w-0">
            <EdgeReadout
              label="Net P&L"
              labelUppercase
              value={pnlValue}
              tone={pnlTone(trade.netPnL)}
              testId="journal-trade-outcome-pnl"
            />
          </div>
        </div>

        {stopSeededFromPlan ? (
          <p
            className="mt-1 text-[10px] text-[var(--edge-text-muted)]"
            data-testid="journal-trade-stop-plan-hint"
          >
            Seeded from plan — save to persist
          </p>
        ) : null}

        {draftRiskPreview && "error" in draftRiskPreview ? (
          <p className="mt-2 text-xs text-[var(--edge-danger)]" data-testid="journal-trade-risk-error">
            {draftRiskPreview.error}
          </p>
        ) : draftRiskPreview ? (
          <p
            className="mt-2 text-xs text-[var(--edge-text-secondary)]"
            data-testid="journal-trade-risk-summary"
          >
            {sharesAndNotional} · Risk{" "}
            {formatTradeMoney(draftRiskPreview.riskUsd)}
            {draftRiskPreview.r != null ? ` · ${draftRiskPreview.r.toFixed(2)}R` : ""}
            {renderCommissionAndRoiInline()}
          </p>
        ) : (
          <p
            className="mt-2 text-xs text-[var(--edge-text-secondary)]"
            data-testid="journal-trade-qty-summary"
          >
            {sharesAndNotional}
            {renderCommissionAndRoiInline()}
          </p>
        )}
      </section>
    </section>
  );
}
