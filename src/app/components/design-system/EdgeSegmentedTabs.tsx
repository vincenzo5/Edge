"use client";

import { segmentedTabClass } from "./styles";

export type EdgeSegment = {
  id: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  segments: EdgeSegment[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
};

export default function EdgeSegmentedTabs({ segments, value, onChange, className = "" }: Props) {
  return (
    <div
      className={`flex gap-0.5 rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] p-0.5 ${className}`.trim()}
      role="tablist"
    >
      {segments.map((segment) => {
        const active = segment.id === value;
        return (
          <button
            key={segment.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={segment.disabled}
            onClick={() => onChange(segment.id)}
            className={`edge-focus-ring flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${segmentedTabClass(active)} ${
              segment.disabled ? "cursor-not-allowed opacity-40" : ""
            }`.trim()}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
