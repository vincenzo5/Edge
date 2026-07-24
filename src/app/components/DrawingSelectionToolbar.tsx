"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DrawingMetadata,
  DrawingStyles,
  SerializedDrawing,
  Theme,
} from "@/lib/chart/contracts";
import {
  ANNOTATION_KIND_FULL_LABELS,
  ANNOTATION_KINDS,
  type AnnotationKind,
} from "@/lib/chart/annotationMetadata";
import { resolveDrawingStyles } from "@/lib/chart/drawingStyles";
import {
  dashPresetFromArray,
  drawingSettingsCapabilities,
  LINE_DASH_PRESETS,
  type LineDashPreset,
} from "@/lib/chart/drawingSettingsCapabilities";
import type { DrawingScreenBounds } from "./EdgeChart";
import {
  resolveDrawingToolbarPosition,
} from "./drawingSelectionToolbarPosition";
import { SettingsIcon } from "./chart-chrome/ChartHeaderIcons";
import EdgeSelect from "./design-system/EdgeSelect";

type Props = {
  theme: Theme;
  drawing: SerializedDrawing;
  bounds: DrawingScreenBounds | null;
  containerWidth: number;
  containerHeight: number;
  dragOffset: { x: number; y: number };
  onDragOffsetChange: (offset: { x: number; y: number }) => void;
  onStyleChange: (patch: Partial<DrawingStyles>) => void;
  onMetadataChange: (patch: DrawingMetadata) => void;
  onAcceptProposal: () => void;
  onDismissProposal: () => void;
  onOpenInChat?: () => void;
  onOpenSettings: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onMore: (clientX: number, clientY: number) => void;
};

const LINE_WIDTHS = [1, 1.5, 2, 3, 4] as const;

function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" aria-hidden>
      {[0, 1, 2].map((row) =>
        [0, 1].map((col) => (
          <circle
            key={`${row}-${col}`}
            cx={2 + col * 5}
            cy={2 + row * 5}
            r="1"
            fill="currentColor"
          />
        )),
      )}
    </svg>
  );
}

export default function DrawingSelectionToolbar({
  theme,
  drawing,
  bounds,
  containerWidth,
  containerHeight,
  dragOffset,
  onDragOffsetChange,
  onStyleChange,
  onMetadataChange,
  onAcceptProposal,
  onDismissProposal,
  onOpenInChat,
  onOpenSettings,
  onToggleLock,
  onDelete,
  onMore,
}: Props) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [size, setSize] = useState({ width: 280, height: 36 });

  const styles = resolveDrawingStyles(drawing, theme, true);
  const caps = drawingSettingsCapabilities(drawing.name);
  const dashPreset = dashPresetFromArray(styles.lineDash);
  const metadata = drawing.metadata;
  const isAiProposal =
    metadata?.source === "ai" && metadata?.status === "proposed";
  const isAiSuggested = metadata?.source === "ai";
  const showRationale = Boolean(metadata?.kind);
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ width: el.offsetWidth, height: el.offsetHeight });
    });
    ro.observe(el);
    setSize({ width: el.offsetWidth, height: el.offsetHeight });
    return () => ro.disconnect();
  }, [drawing.id]);

  const { left, top } = resolveDrawingToolbarPosition({
    bounds,
    toolbar: size,
    container: { width: containerWidth, height: containerHeight },
    dragOffset,
  });

  const handleGripPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        ox: dragOffset.x,
        oy: dragOffset.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [dragOffset.x, dragOffset.y],
  );

  const handleGripPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      onDragOffsetChange({
        x: dragStartRef.current.ox + dx,
        y: dragStartRef.current.oy + dy,
      });
    },
    [onDragOffsetChange],
  );

  const handleGripPointerUp = useCallback((e: React.PointerEvent) => {
    dragStartRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const setDash = (preset: LineDashPreset) => {
    onStyleChange({ lineDash: LINE_DASH_PRESETS[preset] });
  };

  const btnClass =
    "inline-flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-[var(--edge-text-primary)] transition-colors hover:bg-[var(--edge-surface-hover)]";

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Drawing tools"
      className="pointer-events-auto absolute z-30 flex max-w-[calc(100%-8px)] flex-wrap items-center gap-0.5 rounded-md border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] px-1 py-0.5 text-[var(--edge-text-primary)] shadow-[var(--edge-shadow-popover)]"
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Drag toolbar"
        className={`${btnClass} cursor-grab active:cursor-grabbing`}
        onPointerDown={handleGripPointerDown}
        onPointerMove={handleGripPointerMove}
        onPointerUp={handleGripPointerUp}
        onPointerCancel={handleGripPointerUp}
      >
        <GripIcon />
      </button>

      <div className="mx-0.5 h-5 w-px bg-[var(--edge-border-strong)]" />

      <EdgeSelect
        variant="chip"
        density="compact"
        aria-label="Annotation kind"
        value={metadata?.kind ?? ""}
        placeholder="No kind"
        onChange={(value) => {
          if (!value) {
            onMetadataChange({ kind: undefined });
            return;
          }
          onMetadataChange({
            kind: value as AnnotationKind,
            source: metadata?.source ?? "user",
            status: metadata?.status === "proposed" ? "proposed" : "active",
          });
        }}
        options={ANNOTATION_KINDS.map((kind) => ({
          value: kind,
          label: ANNOTATION_KIND_FULL_LABELS[kind],
        }))}
        className="max-w-[7.5rem] text-xs"
        minWidth={120}
      />

      {showRationale && (
        <input
          type="text"
          aria-label="Annotation rationale"
          placeholder="Rationale"
          value={metadata?.rationale ?? ""}
          onChange={(e) =>
            onMetadataChange({
              rationale: e.target.value || undefined,
            })
          }
          className={`h-7 min-w-[8rem] max-w-[12rem] flex-1 rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 text-xs text-[var(--edge-text-primary)] placeholder:text-[var(--edge-text-muted)]`}
        />
      )}

      {isAiSuggested && (
        <span
          data-testid="drawing-ai-suggested"
          className="rounded border border-[var(--edge-border)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--edge-text-tertiary)]"
        >
          AI suggested
        </span>
      )}

      {isAiSuggested && onOpenInChat ? (
        <button
          type="button"
          className={`${btnClass} text-[var(--edge-accent)]`}
          title="Open in chat"
          aria-label="Open in chat"
          onClick={onOpenInChat}
        >
          Chat
        </button>
      ) : null}

      {isAiProposal && (
        <>
          <button
            type="button"
            className={`${btnClass} text-[var(--edge-positive)] hover:text-[color-mix(in_srgb,var(--edge-positive)_80%,transparent)]`}
            title="Accept AI proposal"
            aria-label="Accept AI proposal"
            onClick={onAcceptProposal}
          >
            Accept
          </button>
          <button
            type="button"
            className={`${btnClass} text-[var(--edge-warning)] hover:text-[color-mix(in_srgb,var(--edge-warning)_80%,transparent)]`}
            title="Dismiss AI proposal"
            aria-label="Dismiss AI proposal"
            onClick={onDismissProposal}
          >
            Dismiss
          </button>
        </>
      )}

      {caps.showLine && (
        <>
          <label className={`${btnClass} relative cursor-pointer p-1`} title="Line color">
            <span
              className="block h-3 w-5 rounded-sm border border-white/20"
              style={{ backgroundColor: styles.lineColor ?? "#64748b" }}
            />
            <input
              type="color"
              value={styles.lineColor ?? "#64748b"}
              onChange={(e) => onStyleChange({ lineColor: e.target.value })}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Line color"
            />
          </label>

          <EdgeSelect
            variant="chip"
            density="compact"
            aria-label="Line width"
            value={String(styles.lineWidth ?? 1.5)}
            onChange={(next) => onStyleChange({ lineWidth: Number(next) })}
            options={LINE_WIDTHS.map((width) => ({
              value: String(width),
              label: `${width}px`,
            }))}
            className="text-xs"
            minWidth={70}
          />
        </>
      )}

      {caps.showDash && (
        <EdgeSelect
          variant="chip"
          density="compact"
          aria-label="Line style"
          value={dashPreset}
          onChange={(next) => setDash(next as LineDashPreset)}
          options={[
            { value: "solid", label: "Solid" },
            { value: "dashed", label: "Dashed" },
            { value: "dotted", label: "Dotted" },
          ]}
          className="text-xs"
          minWidth={80}
        />
      )}

      <div className="mx-0.5 h-5 w-px bg-[var(--edge-border-strong)]" />

      <button type="button" className={btnClass} title="Settings" aria-label="Settings" onClick={onOpenSettings}>
        <SettingsIcon size={14} />
      </button>

      <button
        type="button"
        className={btnClass}
        title={drawing.locked ? "Unlock" : "Lock"}
        aria-label={drawing.locked ? "Unlock drawing" : "Lock drawing"}
        onClick={onToggleLock}
      >
        {drawing.locked ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 7.5-2" />
          </svg>
        )}
      </button>

      <button type="button" className={`${btnClass} text-[var(--edge-negative)] hover:text-[color-mix(in_srgb,var(--edge-negative)_80%,transparent)]`} title="Delete" aria-label="Delete drawing" onClick={onDelete}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
        </svg>
      </button>

      <button
        type="button"
        className={btnClass}
        title="More actions"
        aria-label="More actions"
        onClick={(e) => onMore(e.clientX, e.clientY)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </button>
    </div>
  );
}
