"use client";

import { useEffect, useMemo, useState } from "react";
import type { JournalFillResponse, JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import { JOURNAL_SETUP_VALUES, JOURNAL_RATING_VALUES, type PlannedRiskMode } from "@/lib/journal/types";
import { computeRMultiple } from "@/lib/journal/rMultiple";
import { plannedRiskMatchesPositionPlanSnapshot } from "@/lib/trading/playbook/journalRiskHandoff";
import {
  canComputeTradeExcursion,
  computeTradeExcursionForTrade,
} from "@/lib/journal/tradeExcursion";
import {
  collectOrderRefsForTrade,
  isEdgeIntentOrderRef,
} from "@/lib/journal/correlateOrderRef";
import {
  deriveTradeOutcomeStatus,
  formatDirectionLabel,
  formatTradeCloseTime,
  formatTradeMoney,
  formatTradePrice,
  pnlToneClass,
  tradeOutcomeLabel,
} from "@/lib/journal/journalTradeDisplay";
import { fetchJournalFills, patchJournalTradeRemote } from "@/lib/persistence/client/journalClient";
import { EdgeButton, EdgeSelect, EdgeToggle } from "../design-system";
import JournalTradeDetailHeaderTitle from "./JournalTradeDetailHeaderTitle";
import { journalTradeDetailSubtitle } from "./journalTradeDetailTitle";
import JournalTradeScreenshots from "./JournalTradeScreenshots";
import JournalTradeChartSnapshots from "./JournalTradeChartSnapshots";

type Props = {
  trade: JournalTradeResponse;
  onUpdated: (trade: JournalTradeResponse) => void;
  embedded?: boolean;
};

const FILL_TIME_ZONE = "America/New_York";

function formatFillSide(side: string): string {
  const normalized = side.trim().toUpperCase();
  if (normalized === "BOT" || normalized === "BUY") return "BUY";
  if (normalized === "SLD" || normalized === "SELL") return "SELL";
  return normalized;
}

function formatRuleRuntimeStatus(status: string): string {
  if (status === "fired") return "Fired";
  if (status === "skipped") return "Skipped";
  if (status === "cancelled") return "Cancelled";
  if (status === "armed") return "Armed";
  return "Pending";
}

function formatRuleRuntimeTime(iso?: string | null): string {
  if (!iso) return "—";
  return formatTradeCloseTime(iso, FILL_TIME_ZONE);
}

function filterTradeFills(fills: JournalFillResponse[], trade: JournalTradeResponse): JournalFillResponse[] {
  const execIds = new Set(trade.fillExecIds);
  return fills
    .filter((fill) => execIds.has(fill.execId))
    .sort((left, right) => Date.parse(left.fillTime) - Date.parse(right.fillTime));
}

export default function JournalTradeDetail({ trade, onUpdated, embedded = false }: Props) {
  const [tags, setTags] = useState("");
  const [setup, setSetup] = useState<string>("");
  const [reviewNote, setReviewNote] = useState("");
  const [plannedRiskMode, setPlannedRiskMode] = useState<PlannedRiskMode | "">("");
  const [plannedRiskValue, setPlannedRiskValue] = useState("");
  const [rating, setRating] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [ignoring, setIgnoring] = useState(false);
  const [excursionLoading, setExcursionLoading] = useState(false);
  const [excursionError, setExcursionError] = useState<string | null>(null);
  const [tradeFills, setTradeFills] = useState<JournalFillResponse[]>([]);
  const [orderRefs, setOrderRefs] = useState<string[]>([]);

  useEffect(() => {
    setTags((trade.tags ?? []).join(", "));
    setSetup(trade.setup ?? "");
    setReviewNote(trade.reviewNote ?? "");
    setPlannedRiskMode(trade.plannedRiskMode ?? "");
    setPlannedRiskValue(
      trade.plannedRiskValue != null ? String(trade.plannedRiskValue) : "",
    );
    setRating(trade.rating != null ? String(trade.rating) : "");
  }, [trade]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const fills = await fetchJournalFills();
        if (cancelled) return;
        setTradeFills(filterTradeFills(fills, trade));
        setOrderRefs(collectOrderRefsForTrade(fills, trade));
      } catch {
        if (!cancelled) {
          setTradeFills([]);
          setOrderRefs([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trade]);

  async function toggleIgnored(nextIgnored: boolean) {
    setIgnoring(true);
    try {
      const updated = await patchJournalTradeRemote(trade.id, { ignored: nextIgnored });
      if (updated) onUpdated(updated);
    } finally {
      setIgnoring(false);
    }
  }

  async function saveNotes() {
    setSaving(true);
    try {
      const parsedRiskValue = plannedRiskValue.trim()
        ? Number.parseFloat(plannedRiskValue)
        : null;
      const updated = await patchJournalTradeRemote(trade.id, {
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        setup: setup ? (setup as typeof trade.setup) : null,
        reviewNote: reviewNote.trim() || null,
        plannedRiskMode: plannedRiskMode || null,
        plannedRiskValue:
          plannedRiskMode && parsedRiskValue != null && Number.isFinite(parsedRiskValue)
            ? parsedRiskValue
            : null,
        rating: rating ? (Number.parseInt(rating, 10) as typeof trade.rating) : null,
      });
      if (updated) onUpdated(updated);
    } finally {
      setSaving(false);
    }
  }

  const rMultiple = computeRMultiple(trade);
  const managePlaybook = trade.managePlaybook;
  const positionPlanSnapshot = managePlaybook?.positionPlan;
  const showRiskPolicy =
    managePlaybook != null ||
    trade.plannedRiskUsd != null ||
    trade.plannedRiskMode != null ||
    trade.plannedRiskValue != null;
  const autoFilledFromPlan = plannedRiskMatchesPositionPlanSnapshot(
    trade,
    positionPlanSnapshot,
  );
  const excursionEligible = canComputeTradeExcursion(trade);
  const mfeR =
    trade.plannedRiskUsd != null && trade.plannedRiskUsd > 0 && trade.mfeUsd != null
      ? trade.mfeUsd / trade.plannedRiskUsd
      : null;
  const mfaR =
    trade.plannedRiskUsd != null && trade.plannedRiskUsd > 0 && trade.mfaUsd != null
      ? trade.mfaUsd / trade.plannedRiskUsd
      : null;

  async function computeExcursion() {
    if (!trade.closedAt) return;
    setExcursionLoading(true);
    setExcursionError(null);
    try {
      const result = await computeTradeExcursionForTrade({
        symbol: trade.symbol,
        direction: trade.direction,
        avgEntry: trade.avgEntry,
        netQuantity: trade.netQuantity,
        secType: trade.secType,
        legs: trade.legs,
        openedAt: trade.openedAt,
        closedAt: trade.closedAt,
        plannedRiskMode: trade.plannedRiskMode,
        plannedRiskValue: trade.plannedRiskValue,
        plannedRiskUsd: trade.plannedRiskUsd,
      });
      if (!result) {
        setExcursionError("No intraday bars found for this trade window.");
        return;
      }
      const computedAt = new Date().toISOString();
      const updated = await patchJournalTradeRemote(trade.id, {
        mfeUsd: result.mfeUsd,
        mfaUsd: result.mfaUsd,
        excursionInterval: result.interval,
        excursionComputedAt: computedAt,
      });
      if (updated) onUpdated(updated);
    } catch (error) {
      setExcursionError(error instanceof Error ? error.message : "Excursion compute failed.");
    } finally {
      setExcursionLoading(false);
    }
  }

  const outcomeStatus = deriveTradeOutcomeStatus(trade);
  const outcomeLabel = tradeOutcomeLabel(outcomeStatus);
  const shellClass = embedded
    ? "space-y-4"
    : "space-y-4 rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-4";

  const pnlDisplay = useMemo(() => {
    if (trade.status === "open") return "OPEN";
    return formatTradeMoney(trade.netPnL);
  }, [trade.netPnL, trade.status]);

  return (
    <div data-testid="journal-trade-detail" className={shellClass}>
      {!embedded ? (
        <div>
          <h2 className="text-sm font-semibold text-[var(--edge-text-strong)]">
            <JournalTradeDetailHeaderTitle trade={trade} />
          </h2>
          <p className="text-xs text-[var(--edge-text-secondary)]">
            {journalTradeDetailSubtitle(trade)}
          </p>
        </div>
      ) : null}

      <JournalTradeScreenshots tradeId={trade.id} />
      <JournalTradeChartSnapshots trade={trade} fills={tradeFills} />

      <section data-testid="journal-trade-outcome">
        <div className="text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]">
          Outcome
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-elevated)] p-3">
          <div>
            <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">Entry</div>
            <div
              className="mt-1 text-sm font-semibold tabular-nums text-[var(--edge-text-strong)]"
              data-testid="journal-trade-outcome-entry"
            >
              {formatTradePrice(trade.avgEntry)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">Exit</div>
            <div
              className="mt-1 text-sm font-semibold tabular-nums text-[var(--edge-text-strong)]"
              data-testid="journal-trade-outcome-exit"
            >
              {formatTradePrice(trade.avgExit)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">Net P&L</div>
            <div
              className={`mt-1 flex items-center gap-2 text-sm font-semibold tabular-nums ${pnlToneClass(trade.netPnL)}`}
              data-testid="journal-trade-outcome-pnl"
            >
              <span>{pnlDisplay}</span>
              <span
                className="rounded bg-[var(--edge-surface-active)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--edge-text-secondary)]"
                data-testid="journal-trade-outcome-badge"
              >
                {outcomeLabel}
              </span>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--edge-text-secondary)]">
          {formatDirectionLabel(trade.direction)} · Qty {trade.netQuantity ?? "—"} · Comm{" "}
          {formatTradeMoney(trade.totalCommission)} · R{" "}
          {rMultiple != null ? `${rMultiple.toFixed(2)}R` : "—"}
        </p>
      </section>

      <section data-testid="journal-trade-excursion">
        <div className="text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]">
          Excursion
        </div>
        {!excursionEligible ? (
          <p className="mt-2 text-xs text-[var(--edge-text-secondary)]">
            MFE/MFA available for closed stock trades with entry price.
          </p>
        ) : trade.mfeUsd != null && trade.mfaUsd != null ? (
          <div className="mt-2 grid grid-cols-2 gap-2 rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-elevated)] p-3">
            <div>
              <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">MFE</div>
              <div className="mt-1 text-sm font-semibold tabular-nums text-[var(--edge-text-strong)]">
                {formatTradeMoney(trade.mfeUsd)}
                {mfeR != null ? ` · ${mfeR.toFixed(2)}R` : ""}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">MFA</div>
              <div className="mt-1 text-sm font-semibold tabular-nums text-[var(--edge-text-strong)]">
                {formatTradeMoney(trade.mfaUsd)}
                {mfaR != null ? ` · ${mfaR.toFixed(2)}R` : ""}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[var(--edge-text-secondary)]">
            Compute max favorable and adverse excursion from intraday bars.
          </p>
        )}
        {excursionEligible ? (
          <div className="mt-2 flex items-center gap-2">
            <EdgeButton
              variant="secondary"
              data-testid="journal-trade-compute-excursion"
              disabled={excursionLoading}
              onClick={() => void computeExcursion()}
            >
              {excursionLoading ? "Computing…" : trade.mfeUsd != null ? "Recompute excursion" : "Compute excursion"}
            </EdgeButton>
            {trade.excursionInterval ? (
              <span className="text-[10px] text-[var(--edge-text-muted)]">
                {trade.excursionInterval} bars
              </span>
            ) : null}
          </div>
        ) : null}
        {excursionError ? (
          <p className="mt-2 text-xs text-[var(--edge-danger)]">{excursionError}</p>
        ) : null}
      </section>

      <section data-testid="journal-trade-fills">
        <div className="text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]">
          Fills
        </div>
        {tradeFills.length > 0 ? (
          <div className="mt-2 overflow-x-auto rounded border border-[var(--edge-border-subtle)]">
            <table className="min-w-full text-xs">
              <thead className="bg-[var(--edge-surface-hover)] text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">Time</th>
                  <th className="px-2 py-1.5 text-left font-medium">Side</th>
                  <th className="px-2 py-1.5 text-right font-medium">Qty</th>
                  <th className="px-2 py-1.5 text-right font-medium">Price</th>
                  <th className="px-2 py-1.5 text-left font-medium">Order</th>
                </tr>
              </thead>
              <tbody>
                {tradeFills.map((fill) => (
                  <tr
                    key={fill.execId}
                    className="border-t border-[var(--edge-border-subtle)]"
                    data-testid={`journal-trade-fill-${fill.execId}`}
                  >
                    <td className="px-2 py-1.5 tabular-nums text-[var(--edge-text-primary)]">
                      {formatTradeCloseTime(fill.fillTime, FILL_TIME_ZONE)}
                    </td>
                    <td className="px-2 py-1.5 text-[var(--edge-text-primary)]">
                      {formatFillSide(fill.side)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-[var(--edge-text-primary)]">
                      {fill.quantity}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-[var(--edge-text-primary)]">
                      {formatTradePrice(fill.price)}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-[11px] text-[var(--edge-text-secondary)]">
                      {fill.orderRef?.trim() || fill.orderId?.toString() || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[var(--edge-text-secondary)]">No fill details loaded.</p>
        )}

        {(trade.fillExecIds.length > 0 || orderRefs.length > 0) ? (
          <details className="mt-2 text-xs" data-testid="journal-trade-tech-details">
            <summary className="cursor-pointer text-[var(--edge-text-secondary)] hover:text-[var(--edge-text-primary)]">
              Tech details
            </summary>
            <div className="mt-2 space-y-2">
              {trade.fillExecIds.length > 0 ? (
                <div>
                  <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">
                    Exec IDs
                  </div>
                  <ul className="mt-1 space-y-1 font-mono text-[11px] text-[var(--edge-text-secondary)]">
                    {trade.fillExecIds.map((execId) => (
                      <li key={execId} className="break-all">
                        {execId}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {orderRefs.length > 0 ? (
                <div>
                  <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">
                    Order refs
                  </div>
                  <ul className="mt-1 space-y-1">
                    {orderRefs.map((orderRef) => (
                      <li
                        key={orderRef}
                        className="break-all font-mono text-[11px] text-[var(--edge-text-secondary)]"
                      >
                        {orderRef}
                        {isEdgeIntentOrderRef(orderRef) ? (
                          <span className="ml-2 rounded bg-[var(--edge-surface-active)] px-1.5 py-0.5 text-[9px] uppercase tracking-wide">
                            Edge
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </details>
        ) : null}
      </section>

      {trade.legs && trade.legs.length > 0 ? (
        <div>
          <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">Legs</div>
          <ul className="mt-1 space-y-1 text-xs">
            {trade.legs.map((leg, index) => (
              <li key={`${leg.conId ?? index}`} className="rounded border border-[var(--edge-border-subtle)] px-2 py-1">
                {leg.localSymbol ?? leg.symbol} · {leg.strike ?? ""}{leg.right ?? ""} · qty {leg.netQuantity ?? "—"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showRiskPolicy ? (
        <section data-testid="journal-trade-risk-policy">
          <div className="text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]">
            Risk policy
          </div>
          <div className="mt-2 space-y-3 rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-elevated)] p-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">Budget</div>
                <div
                  className="mt-1 font-semibold tabular-nums text-[var(--edge-text-strong)]"
                  data-testid="journal-trade-risk-budget"
                >
                  {trade.plannedRiskUsd != null
                    ? formatTradeMoney(trade.plannedRiskUsd)
                    : trade.plannedRiskMode === "pct" && trade.plannedRiskValue != null
                      ? `${trade.plannedRiskValue}%`
                      : trade.plannedRiskMode === "usd" && trade.plannedRiskValue != null
                        ? formatTradeMoney(trade.plannedRiskValue)
                        : "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">R</div>
                <div
                  className="mt-1 font-semibold tabular-nums text-[var(--edge-text-strong)]"
                  data-testid="journal-trade-risk-r"
                >
                  {rMultiple != null ? `${rMultiple.toFixed(2)}R` : "—"}
                </div>
              </div>
            </div>

            {positionPlanSnapshot ? (
              <div className="text-xs" data-testid="journal-trade-risk-geometry">
                <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">
                  Geometry
                </div>
                <p className="mt-1 text-[var(--edge-text-primary)]">
                  Entry {formatTradePrice(positionPlanSnapshot.entry)} · Stop{" "}
                  {formatTradePrice(positionPlanSnapshot.initialStop)} · R unit{" "}
                  {formatTradePrice(positionPlanSnapshot.rUnit)} · Qty {positionPlanSnapshot.qty}
                </p>
              </div>
            ) : null}

            {managePlaybook?.protectSummary ? (
              <div className="text-xs" data-testid="journal-trade-risk-protect">
                <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">
                  Protect
                </div>
                <p className="mt-1 text-[var(--edge-text-primary)]">
                  {managePlaybook.protectSummary}
                </p>
              </div>
            ) : null}

            {managePlaybook ? (
              <div data-testid="journal-trade-risk-manage">
                <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">Manage</div>
                <div className="mt-1 text-sm font-semibold text-[var(--edge-text-strong)]">
                  {managePlaybook.templateName}
                </div>
                <p
                  className="mt-1 text-xs text-[var(--edge-text-secondary)]"
                  data-testid="journal-trade-manage-adherence"
                >
                  {managePlaybook.firedRuleCount} of {managePlaybook.plannedRuleCount} rules fired
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]">
                      <tr>
                        <th className="px-2 py-1 text-left font-medium">Rule</th>
                        <th className="px-2 py-1 text-left font-medium">Status</th>
                        <th className="px-2 py-1 text-left font-medium">Fired</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managePlaybook.ruleTimeline.map((runtime) => (
                        <tr
                          key={runtime.ruleId}
                          className="border-t border-[var(--edge-border-subtle)]"
                          data-testid={`journal-trade-manage-rule-${runtime.ruleId}`}
                        >
                          <td className="px-2 py-1.5 text-[var(--edge-text-primary)]">
                            {runtime.ruleId}
                          </td>
                          <td className="px-2 py-1.5 text-[var(--edge-text-primary)]">
                            {formatRuleRuntimeStatus(runtime.status)}
                          </td>
                          <td className="px-2 py-1.5 tabular-nums text-[var(--edge-text-secondary)]">
                            {formatRuleRuntimeTime(runtime.firedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="space-y-3" data-testid="journal-trade-review">
        <div className="text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]">
          Review
        </div>

        <EdgeToggle
          testId="journal-trade-ignore-stats"
          label="Ignore from stats"
          info="Keep this trade in history but exclude it from performance metrics."
          checked={trade.ignored ?? false}
          disabled={ignoring}
          onChange={(checked) => void toggleIgnored(checked)}
        />

        <label className="block text-xs">
          <span className="text-[var(--edge-text-secondary)]">Setup</span>
          <div className="mt-1">
            <EdgeSelect
              variant="field"
              density="compact"
              value={setup || "__empty__"}
              onChange={(next) => setSetup(next === "__empty__" ? "" : next)}
              options={[
                { value: "__empty__", label: "—" },
                ...JOURNAL_SETUP_VALUES.map((value) => ({ value, label: value })),
              ]}
              className="w-full"
            />
          </div>
        </label>

        <label className="block text-xs">
          <span className="text-[var(--edge-text-secondary)]">Tags (comma separated)</span>
          <input
            className="mt-1 w-full rounded border border-[var(--edge-border)] bg-transparent px-2 py-1"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
        </label>

        <label className="block text-xs">
          <span className="text-[var(--edge-text-secondary)]">Rating</span>
          <div className="mt-1">
            <EdgeSelect
              testId="journal-trade-rating"
              variant="field"
              density="compact"
              value={rating || "__empty__"}
              onChange={(next) => setRating(next === "__empty__" ? "" : next)}
              options={[
                { value: "__empty__", label: "—" },
                ...JOURNAL_RATING_VALUES.map((value) => ({
                  value: String(value),
                  label: `${value}`,
                })),
              ]}
              className="w-full"
            />
          </div>
        </label>

        <label className="block text-xs">
          <span className="text-[var(--edge-text-secondary)]">Planned risk</span>
          {autoFilledFromPlan ? (
            <p
              className="mt-0.5 text-[10px] text-[var(--edge-text-muted)]"
              data-testid="journal-planned-risk-autofill-hint"
            >
              Auto-filled from Plan
            </p>
          ) : null}
          <div className="mt-1 flex gap-2">
            <EdgeSelect
              testId="journal-planned-risk-mode"
              variant="field"
              density="compact"
              value={plannedRiskMode || "__empty__"}
              onChange={(next) =>
                setPlannedRiskMode(next === "__empty__" ? "" : (next as PlannedRiskMode))
              }
              options={[
                { value: "__empty__", label: "—" },
                { value: "usd", label: "$" },
                { value: "pct", label: "%" },
              ]}
              className="min-w-[4rem]"
            />
            <input
              className="min-w-0 flex-1 rounded border border-[var(--edge-border)] bg-transparent px-2 py-1"
              type="number"
              min="0"
              step="any"
              placeholder={plannedRiskMode === "pct" ? "Percent" : "Dollars"}
              value={plannedRiskValue}
              onChange={(event) => setPlannedRiskValue(event.target.value)}
              data-testid="journal-planned-risk-value"
            />
          </div>
        </label>

        <label className="block text-xs">
          <span className="text-[var(--edge-text-secondary)]">Review note</span>
          <textarea
            className="mt-1 min-h-24 w-full rounded border border-[var(--edge-border)] bg-transparent px-2 py-1"
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
          />
        </label>
      </section>

      <EdgeButton variant="primary" disabled={saving} onClick={() => void saveNotes()}>
        Save notes
      </EdgeButton>
    </div>
  );
}
