"use client";

import type { DayProfile } from "@/lib/dayProfiles/types";
import {
  labelForDayType,
  labelForGap,
  labelForOpenType,
  labelForRelative,
} from "@/lib/dayProfiles/labels";

type Props = {
  profile: DayProfile;
  selected: boolean;
  onSelect: () => void;
};

export default function DayProfileCard({ profile, selected, onSelect }: Props) {
  const relativeLabel = profile.relative ? labelForRelative(profile.relative) : null;

  return (
    <button
      type="button"
      data-testid={`day-profile-card-${profile.symbol}-${profile.date}`}
      onClick={onSelect}
      className={`w-full rounded-md border p-2 text-left transition-colors ${
        selected
          ? "border-[var(--edge-accent-blue)] bg-[var(--edge-surface-hover)]"
          : "border-[var(--edge-border)] bg-[var(--edge-surface-panel)] hover:bg-[var(--edge-surface-hover)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-[var(--edge-text-primary)]">
            {profile.symbol} · {profile.date}
          </div>
          <div className="mt-1 text-xs text-[var(--edge-text-secondary)]">
            {labelForDayType(profile.dayType)} · {labelForOpenType(profile.openType)}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <Tag label={labelForGap(profile.gap)} />
        {relativeLabel ? <Tag label={relativeLabel} /> : null}
      </div>
    </button>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="rounded bg-[var(--edge-surface-active)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
      {label}
    </span>
  );
}
