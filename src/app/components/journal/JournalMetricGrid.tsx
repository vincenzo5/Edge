"use client";

import type { EdgeTone } from "@/lib/design-system/edge";
import { toneTextClass } from "@/lib/design-system/edge";

export type JournalMetricItem = {
  label: string;
  value: string;
  tone?: EdgeTone;
  testId?: string;
};

type Props = {
  metrics: JournalMetricItem[];
  testId?: string;
};

export default function JournalMetricGrid({ metrics, testId = "journal-metric-grid" }: Props) {
  return (
    <div
      data-testid={testId}
      className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4"
    >
      {metrics.map((metric) => (
        <div key={metric.label} data-testid={metric.testId ?? `${testId}-${metric.label}`}>
          <div className="text-[10px] text-[var(--edge-text-secondary)]">{metric.label}</div>
          <div
            className={`mt-0.5 text-sm font-semibold tabular-nums text-[var(--edge-text-strong)] ${
              metric.tone ? toneTextClass(metric.tone) : ""
            }`}
          >
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  );
}
