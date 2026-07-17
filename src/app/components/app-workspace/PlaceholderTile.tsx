"use client";

import type { AssignableSurfaceId } from "@/lib/appWorkspace/commands";

const ASSIGNABLE_SURFACES: { id: AssignableSurfaceId; label: string }[] = [
  { id: "chart", label: "Chart" },
  { id: "screener", label: "Screener" },
  { id: "journal", label: "Journal" },
];

type Props = {
  onAssign: (surfaceId: AssignableSurfaceId) => void;
};

export default function PlaceholderTile({ onAssign }: Props) {
  return (
    <div
      data-testid="placeholder-tile"
      className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-[var(--edge-surface)] p-4"
    >
      <p className="text-sm text-[var(--edge-text-muted)]">Choose an app for this pane</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {ASSIGNABLE_SURFACES.map((surface) => (
          <button
            key={surface.id}
            type="button"
            data-testid={`placeholder-assign-${surface.id}`}
            className="rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-raised)] px-3 py-1.5 text-xs font-medium text-[var(--edge-text-secondary)] transition-colors hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)]"
            onClick={() => onAssign(surface.id)}
          >
            {surface.label}
          </button>
        ))}
      </div>
    </div>
  );
}
