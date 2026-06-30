"use client";

import type { ScreenerResultRow } from "@/lib/screener/types";
import { EdgeModalShell } from "../design-system";
import ComparisonView from "./ComparisonView";

type Props = {
  open: boolean;
  onClose: () => void;
  rows: ScreenerResultRow[];
  indicatorValues?: Record<string, Record<string, number>>;
};

export default function ComparisonDialog({
  open,
  onClose,
  rows,
  indicatorValues,
}: Props) {
  return (
    <EdgeModalShell
      open={open}
      title="Compare symbols"
      subtitle={`Side-by-side metrics for ${rows.length} selected ticker${rows.length === 1 ? "" : "s"}.`}
      onClose={onClose}
      maxWidth="lg"
      align="top"
      testId="screener-comparison-dialog"
    >
      <div className="flex max-h-[min(70vh,640px)] min-h-[280px] flex-col overflow-hidden">
        <ComparisonView rows={rows} indicatorValues={indicatorValues} />
      </div>
    </EdgeModalShell>
  );
}
