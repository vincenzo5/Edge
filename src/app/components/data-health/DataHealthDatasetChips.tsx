"use client";

import type { DatasetChip, DatasetChipTone } from "@/lib/marketData/health";

function chipToneClass(tone: DatasetChipTone = "default"): string {
  switch (tone) {
    case "positive":
      return "text-[var(--edge-positive)]";
    case "warning":
      return "text-[var(--edge-warning)]";
    case "muted":
      return "text-[var(--edge-text-muted)]";
    default:
      return "text-[var(--edge-text-secondary)]";
  }
}

type Props = {
  chips: DatasetChip[];
};

export default function DataHealthDatasetChips({ chips }: Props) {
  if (chips.length === 0) return null;

  return (
    <div className="mt-0.5 flex flex-wrap gap-1 pl-3">
      {chips.map((chip, index) => (
        <span
          key={`${chip.label}-${index}`}
          className={`rounded px-1.5 py-0.5 text-[10px] bg-[var(--edge-surface-active)] ${chipToneClass(chip.tone)}`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

export { chipToneClass };
