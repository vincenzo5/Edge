"use client";

import {
  formatTradeListDate,
} from "@/lib/journal/journalTradeDisplay";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

type Props = {
  trade: JournalTradeResponse;
};

function OpenedIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M7 3.5H4.5A1.5 1.5 0 0 0 3 5v6a1.5 1.5 0 0 0 1.5 1.5H7"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M7 8h6m0 0-2.25-2.25M13 8l-2.25 2.25"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClosedIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M9 3.5h2.5A1.5 1.5 0 0 1 13 5v6a1.5 1.5 0 0 1-1.5 1.5H9"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M9 8H3m0 0 2.25-2.25M3 8l2.25 2.25"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function JournalTradeDetailHeaderSubtitle({ trade }: Props) {
  return (
    <span
      className="inline-flex items-center gap-2"
      data-testid="journal-trade-detail-subtitle"
    >
      <span className="inline-flex items-center gap-1" title="Opened" aria-label={`Opened ${formatTradeListDate(trade.openedAt)}`}>
        <OpenedIcon />
        <span>{formatTradeListDate(trade.openedAt)}</span>
      </span>
      {trade.closedAt ? (
        <>
          <span aria-hidden="true">·</span>
          <span
            className="inline-flex items-center gap-1"
            title="Closed"
            aria-label={`Closed ${formatTradeListDate(trade.closedAt)}`}
          >
            <ClosedIcon />
            <span>{formatTradeListDate(trade.closedAt)}</span>
          </span>
        </>
      ) : null}
    </span>
  );
}
