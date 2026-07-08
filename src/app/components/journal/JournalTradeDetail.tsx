"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import { JOURNAL_SETUP_VALUES, type PlannedRiskMode } from "@/lib/journal/types";
import { buildChartDeepLink } from "@/lib/journal/chartDeepLink";
import { computeRMultiple } from "@/lib/journal/rMultiple";
import { patchJournalTradeRemote } from "@/lib/persistence/client/journalClient";
import { EdgeButton } from "../design-system";

type Props = {
  trade: JournalTradeResponse;
  onUpdated: (trade: JournalTradeResponse) => void;
  embedded?: boolean;
};

export default function JournalTradeDetail({ trade, onUpdated, embedded = false }: Props) {
  const [tags, setTags] = useState("");
  const [setup, setSetup] = useState<string>("");
  const [reviewNote, setReviewNote] = useState("");
  const [plannedRiskMode, setPlannedRiskMode] = useState<PlannedRiskMode | "">("");
  const [plannedRiskValue, setPlannedRiskValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTags((trade.tags ?? []).join(", "));
    setSetup(trade.setup ?? "");
    setReviewNote(trade.reviewNote ?? "");
    setPlannedRiskMode(trade.plannedRiskMode ?? "");
    setPlannedRiskValue(
      trade.plannedRiskValue != null ? String(trade.plannedRiskValue) : "",
    );
  }, [trade]);

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
      });
      if (updated) onUpdated(updated);
    } finally {
      setSaving(false);
    }
  }

  const rMultiple = computeRMultiple(trade);
  const shellClass = embedded
    ? "space-y-3"
    : "space-y-3 rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-4";

  return (
    <div data-testid="journal-trade-detail" className={shellClass}>
      {!embedded ? (
        <div>
          <h2 className="text-sm font-semibold text-[var(--edge-text-strong)]">
            {trade.symbol} · {trade.secType} · {trade.status}
          </h2>
          <p className="text-xs text-[var(--edge-text-secondary)]">
            Opened {trade.openedAt.slice(0, 19)}
            {trade.closedAt ? ` · Closed ${trade.closedAt.slice(0, 19)}` : ""}
          </p>
        </div>
      ) : null}

      <div>
        <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">Fills</div>
        <ul className="mt-1 space-y-1 text-xs">
          {trade.fillExecIds.map((execId) => (
            <li key={execId} className="rounded border border-[var(--edge-border-subtle)] px-2 py-1">
              {execId}
            </li>
          ))}
        </ul>
      </div>

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

      <label className="block text-xs">
        <span className="text-[var(--edge-text-secondary)]">Setup</span>
        <select
          className="mt-1 w-full rounded border border-[var(--edge-border)] bg-transparent px-2 py-1"
          value={setup}
          onChange={(event) => setSetup(event.target.value)}
        >
          <option value="">—</option>
          {JOURNAL_SETUP_VALUES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
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
        <span className="text-[var(--edge-text-secondary)]">Planned risk</span>
        <div className="mt-1 flex gap-2">
          <select
            className="rounded border border-[var(--edge-border)] bg-transparent px-2 py-1"
            value={plannedRiskMode}
            onChange={(event) =>
              setPlannedRiskMode(event.target.value as PlannedRiskMode | "")
            }
            data-testid="journal-planned-risk-mode"
          >
            <option value="">—</option>
            <option value="usd">$</option>
            <option value="pct">%</option>
          </select>
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

      {trade.status === "closed" ? (
        <div className="text-xs" data-testid="journal-r-multiple">
          <span className="text-[var(--edge-text-secondary)]">R-multiple: </span>
          <span className="font-medium text-[var(--edge-text-strong)]">
            {rMultiple != null ? `${rMultiple.toFixed(2)}R` : "—"}
          </span>
        </div>
      ) : null}

      <label className="block text-xs">
        <span className="text-[var(--edge-text-secondary)]">Review note</span>
        <textarea
          className="mt-1 min-h-24 w-full rounded border border-[var(--edge-border)] bg-transparent px-2 py-1"
          value={reviewNote}
          onChange={(event) => setReviewNote(event.target.value)}
        />
      </label>

      <EdgeButton variant="primary" disabled={saving} onClick={() => void saveNotes()}>
        Save notes
      </EdgeButton>

      <Link
        href={buildChartDeepLink(trade)}
        data-testid="journal-trade-detail-chart"
        className="inline-block text-xs text-[var(--edge-accent-blue)] hover:underline"
      >
        Open chart
      </Link>
    </div>
  );
}
