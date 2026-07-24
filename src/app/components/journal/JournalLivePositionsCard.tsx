"use client";

import { EdgeEmptyState } from "@/app/components/design-system";
import { useValueFlash } from "@/lib/design-system/useValueFlash";
import {
  formatTradeMoney,
  pnlToneClass,
} from "@/lib/journal/journalTradeDisplay";
import type { AccountPosition } from "@/lib/marketData/contracts/brokerage";

type Props = {
  positions: AccountPosition[];
  testId?: string;
};

function formatSymbol(position: AccountPosition): string {
  const contract = position.contract;
  if (contract.secType === "OPT" && contract.localSymbol?.trim()) {
    return contract.localSymbol.trim();
  }
  return contract.symbol?.trim() || "—";
}

function LivePositionRow({
  row,
  testId,
}: {
  row: AccountPosition;
  testId: string;
}) {
  const symbol = formatSymbol(row);
  const pnl = row.unrealizedPNL;
  const pnlFlash = useValueFlash(pnl);
  const pnlClass = pnlFlash.toneClass || pnlToneClass(pnl);

  return (
    <li
      data-testid={`${testId}-row-${symbol.replace(/\s+/g, "-")}`}
      className="grid grid-cols-3 gap-2 border-b border-[var(--edge-border-subtle)] px-3 py-2.5 text-xs"
    >
      <span className="text-[var(--edge-text-primary)] tabular-nums">
        {row.position ?? "—"}
      </span>
      <span className="font-medium text-[var(--edge-text-strong)]">{symbol}</span>
      <span
        data-testid={`${testId}-pnl-${symbol.replace(/\s+/g, "-")}`}
        data-flash={pnlFlash.flash}
        className={`text-right font-medium tabular-nums transition-colors duration-[2000ms] motion-reduce:transition-none ${pnlClass}`}
      >
        {formatTradeMoney(pnl)}
      </span>
    </li>
  );
}

export default function JournalLivePositionsCard({
  positions,
  testId = "journal-open-positions-card",
}: Props) {
  const rows = positions.filter((row) => Math.abs(row.position ?? 0) > 0);

  return (
    <section
      data-testid={testId}
      className="flex h-full min-h-0 flex-col rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)]"
    >
      <div className="shrink-0 border-b border-[var(--edge-border-subtle)] px-3 pt-3">
        <h2 className="inline-block border-b-2 border-[var(--edge-accent-blue)] pb-2 text-sm font-semibold text-[var(--edge-text-strong)]">
          Open positions
        </h2>
      </div>

      <div className="grid shrink-0 grid-cols-3 gap-2 border-b border-[var(--edge-border-subtle)] bg-[var(--edge-surface-hover)] px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-[var(--edge-text-secondary)]">
        <span>Qty</span>
        <span>Symbol</span>
        <span className="text-right">Unrealized</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" style={{ maxHeight: "20rem" }}>
        {rows.length === 0 ? (
          <EdgeEmptyState message="No open positions on this account" />
        ) : (
          <ul>
            {rows.map((row, index) => {
              const symbol = formatSymbol(row);
              const key = `${row.contract.conId ?? symbol}-${index}`;
              return <LivePositionRow key={key} row={row} testId={testId} />;
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
