"use client";

import type { ReactNode } from "react";

import type { AssignableSurfaceId } from "@/lib/appWorkspace/commands";
import type { SurfaceId } from "@/lib/appWorkspace/types";

import { EdgeSelect } from "@/app/components/design-system";
import { TileDensityProvider } from "./TileDensityContext";

const SURFACE_LABELS: Record<SurfaceId, string> = {
  chart: "Chart",
  screener: "Screener",
  journal: "Journal",
  scripts: "Scripts",
  alerts: "Alerts",
  copilot: "Copilot",
  placeholder: "Panel",
};

const REASSIGNABLE_SURFACES: AssignableSurfaceId[] = [
  "chart",
  "screener",
  "journal",
  "scripts",
  "alerts",
  "copilot",
];

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
      data-workspace-tile-id={tileId}
      data-surface={surfaceId}
      data-edit-mode={editMode ? "true" : "false"}
      data-active={active ? "true" : "false"}
      className={`relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden ${
        editMode
          ? `border ${active ? "border-[var(--edge-accent-blue)]" : "border-[var(--edge-border-subtle)]"}`
          : ""
      }`}
      onPointerDown={onFocus}
    >
      {editMode ? (
        <div
          {...dragHandleProps}
          data-testid={`tile-header-${tileId}`}
          className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-[var(--edge-border-subtle)] bg-[var(--edge-surface-toolbar)] px-2"
        >
          {showReassign ? (
            <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
              <EdgeSelect
                testId={`tile-reassign-${tileId}`}
                variant="chip"
                density="compact"
                aria-label={`Change surface for ${SURFACE_LABELS[surfaceId]} tile`}
                value={surfaceId}
                onChange={(next) => onReassign(next as AssignableSurfaceId)}
                options={REASSIGNABLE_SURFACES.map((id) => ({
                  value: id,
                  label: SURFACE_LABELS[id],
                }))}
                className="max-w-[7rem] text-xs"
                minWidth={110}
              />
            </div>
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
      <TileDensityProvider>{children}</TileDensityProvider>
      {/* Overlay ring paints above opaque surfaces (e.g. chart canvas) that cover inset box-shadow. */}
      {!editMode && active ? (
        <div
          aria-hidden
          data-testid={`tile-active-ring-${tileId}`}
          className="pointer-events-none absolute inset-0 z-20 ring-1 ring-inset ring-[var(--edge-accent-blue)]"
        />
      ) : null}
    </div>
  );
}
