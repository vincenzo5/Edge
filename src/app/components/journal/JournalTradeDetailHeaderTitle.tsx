"use client";

import Link from "next/link";
import { buildChartDeepLink } from "@/lib/journal/chartDeepLink";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

type Props = {
  trade: JournalTradeResponse;
};

export default function JournalTradeDetailHeaderTitle({ trade }: Props) {
  return (
    <>
      <Link
        href={buildChartDeepLink(trade)}
        data-testid="journal-trade-detail-chart"
        className="text-[var(--edge-accent-blue)] hover:underline"
      >
        {trade.symbol}
      </Link>
      <span className="text-[var(--edge-text-secondary)]">
        {" "}
        · {trade.secType} · {trade.status}
      </span>
    </>
  );
}
