"use client";

import type { EdgeTone } from "@/lib/design-system/edge";
import { EdgeMetricTile } from "@/app/components/design-system";
import { useTileDensity } from "@/app/components/app-workspace/TileDensityContext";
import { journalMetricGridClass } from "@/lib/responsive/tileDensity";

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
  const { mode } = useTileDensity();

  return (
    <div
      data-testid={testId}
      className={journalMetricGridClass(mode)}
    >
      {metrics.map((metric) => (
        <EdgeMetricTile
          key={metric.label}
          label={metric.label}
          value={metric.value}
          tone={metric.tone}
          data-testid={metric.testId ?? `${testId}-${metric.label}`}
        />
      ))}
    </div>
  );
}
