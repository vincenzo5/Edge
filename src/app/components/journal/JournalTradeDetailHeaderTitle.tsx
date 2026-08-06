"use client";

import Link from "next/link";
import { buildChartDeepLink } from "@/lib/journal/chartDeepLink";
import {
  formatDirectionLabel,
  formatTradeHeaderStatus,
  outcomeToneClass,
} from "@/lib/journal/journalTradeDisplay";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

type Props = {
  trade: JournalTradeResponse;
};

function BullIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Horns + head silhouette */}
      <path d="M1.6 4.1 3.5 2.4c.35-.3.9-.2 1.15.2L5.8 4.3c.35.55.95.9 1.6.9h1.2c.65 0 1.25-.35 1.6-.9l1.15-1.7c.25-.4.8-.5 1.15-.2L14.4 4.1c.4.35.4 1 0 1.3L12.7 6.7c-.25.2-.4.5-.4.8v1.35c0 .85-.5 1.6-1.25 1.95L10.3 11.2v2.05c0 .4-.35.75-.75.75H6.45c-.4 0-.75-.35-.75-.75V11.2l-.75-.4C4.2 10.45 3.7 9.7 3.7 8.85V7.5c0-.3-.15-.6-.4-.8L1.6 5.4c-.4-.3-.4-.95 0-1.3Z" />
    </svg>
  );
}

function BearIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Round ears + head silhouette */}
      <circle cx="4.1" cy="4.35" r="1.65" />
      <circle cx="11.9" cy="4.35" r="1.65" />
      <path d="M8 2.55c2.85 0 5.15 1.95 5.15 4.55 0 1.45-.65 2.7-1.7 3.5v2.35c0 .45-.35.8-.8.8H5.35c-.45 0-.8-.35-.8-.8V10.6c-1.05-.8-1.7-2.05-1.7-3.5C2.85 4.5 5.15 2.55 8 2.55Z" />
    </svg>
  );
}

function DirectionIcon({ direction }: { direction: "long" | "short" }) {
  const isShort = direction === "short";
  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded ${
        isShort
          ? "bg-[color-mix(in_srgb,var(--edge-negative)_16%,transparent)] text-[var(--edge-negative)]"
          : "bg-[color-mix(in_srgb,var(--edge-positive)_16%,transparent)] text-[var(--edge-positive)]"
      }`}
      title={formatDirectionLabel(direction)}
      aria-label={formatDirectionLabel(direction)}
      data-testid="journal-trade-detail-direction"
      data-direction={direction}
      data-icon={isShort ? "bear" : "bull"}
    >
      {isShort ? <BearIcon /> : <BullIcon />}
    </span>
  );
}

function HeaderStatus({ trade }: { trade: JournalTradeResponse }) {
  const status = formatTradeHeaderStatus(trade);
  const toneClass = outcomeToneClass(status.tone);

  return (
    <span
      className={`inline-flex items-center gap-1.5 tabular-nums ${toneClass}`}
      data-testid="journal-trade-detail-status"
      data-outcome={status.tone}
    >
      <span className="font-medium">{status.label}</span>
      {status.pnl ? <span>{status.pnl}</span> : null}
    </span>
  );
}

export function JournalTradeDetailHeaderMeta({ trade }: Props) {
  return (
    <span
      className="inline-flex items-center gap-2 text-sm"
      data-testid="journal-trade-detail-header-meta"
    >
      <DirectionIcon direction={trade.direction} />
      <HeaderStatus trade={trade} />
    </span>
  );
}

export default function JournalTradeDetailHeaderTitle({ trade }: Props) {
  return (
    <Link
      href={buildChartDeepLink(trade)}
      data-testid="journal-trade-detail-chart"
      className="text-[var(--edge-accent-blue)] hover:underline"
    >
      {trade.symbol}
    </Link>
  );
}
