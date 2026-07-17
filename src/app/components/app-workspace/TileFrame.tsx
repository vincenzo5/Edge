"use client";

import type { ReactNode } from "react";

import type { AssignableSurfaceId } from "@/lib/appWorkspace/commands";
import type { SurfaceId } from "@/lib/appWorkspace/types";

const SURFACE_LABELS: Record<SurfaceId, string> = {
  chart: "Chart",
  screener: "Screener",
  journal: "Journal",
  placeholder: "Panel",
};

const REASSIGNABLE_SURFACES: AssignableSurfaceId[] = ["chart", "screener", "journal"];

type Props = {
  tileId: string;
  surfaceId: SurfaceId;
  active: boolean;
  editMode: boolean;
  onFocus: () => void;
  onClose?: () => void;
  onReassign?: (surfaceId: AssignableSurfaceId) => void;
  canClose: boolean;
  children: ReactNode;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
};

export default function TileFrame({
  tileId,
  surfaceId,
  active,
  editMode,
  onFocus,
  onClose,
  onReassign,
  canClose,
  children,
  dragHandleProps,
}: Props) {
  const showReassign = editMode && surfaceId !== "placeholder" && onReassign;

  return (
    <div
      data-testid={`tile-frame-${tileId}`}
      data-surface={surfaceId}
      data-edit-mode={editMode ? "true" : "false"}
      className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden ${
        editMode
          ? `border ${active ? "border-[var(--edge-accent)]" : "border-[var(--edge-border-subtle)]"}`
          : active
            ? "ring-1 ring-inset ring-[var(--edge-accent)]"
            : ""
      }`}
      onPointerDown={onFocus}
    >
      {editMode ? (
        <div
          {...dragHandleProps}
          data-testid={`tile-header-${tileId}`}
          className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-[var(--edge-border-subtle)] bg-[var(--edge-surface-raised)] px-2"
        >
          {showReassign ? (
            <select
              aria-label={`Change surface for ${SURFACE_LABELS[surfaceId]} tile`}
              data-testid={`tile-reassign-${tileId}`}
              className="min-w-0 max-w-[7rem] truncate rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface)] px-1 py-0.5 text-xs text-[var(--edge-text-secondary)]"
              value={surfaceId}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) =>
                onReassign(event.target.value as AssignableSurfaceId)
              }
            >
              {REASSIGNABLE_SURFACES.map((id) => (
                <option key={id} value={id}>
                  {SURFACE_LABELS[id]}
                </option>
              ))}
            </select>
          ) : (
            <span className="truncate text-xs font-medium text-[var(--edge-text-secondary)]">
              {SURFACE_LABELS[surfaceId]}
            </span>
          )}
          {canClose ? (
            <button
              type="button"
              aria-label={`Close ${SURFACE_LABELS[surfaceId]} tile`}
              data-testid={`tile-close-${tileId}`}
              className="rounded px-1 text-xs text-[var(--edge-text-muted)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)]"
              onClick={(event) => {
                event.stopPropagation();
                onClose?.();
              }}
            >
              ×
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
