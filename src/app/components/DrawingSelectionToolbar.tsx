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
  const isDark = theme === "dark";
  const metadata = drawing.metadata;
  const isAiProposal =
    metadata?.source === "ai" && metadata?.status === "proposed";
  const showRationale = Boolean(metadata?.kind);
  const selectClass = `h-7 max-w-[7.5rem] rounded border px-1 text-xs ${
    isDark
      ? "border-[#434651] bg-[#131722] text-[#d1d4dc]"
      : "border-gray-300 bg-white text-gray-800"
  }`;

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

  const defaultLeft = bounds
    ? bounds.x + bounds.width / 2 - size.width / 2
    : containerWidth / 2 - size.width / 2;
  const defaultTop = bounds ? bounds.y - size.height - 8 : 8;
  const left = Math.max(4, Math.min(containerWidth - size.width - 4, defaultLeft + dragOffset.x));
  const top = Math.max(4, Math.min(containerHeight - size.height - 4, defaultTop + dragOffset.y));

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

  const btnClass = `inline-flex h-7 min-w-7 items-center justify-center rounded px-1.5 transition-colors ${
    isDark
      ? "text-[#d1d4dc] hover:bg-[#363a45]"
      : "text-gray-700 hover:bg-gray-200"
  }`;

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Drawing tools"
      className={`pointer-events-auto absolute z-30 flex max-w-[calc(100%-8px)] flex-wrap items-center gap-0.5 rounded-md border px-1 py-0.5 shadow-lg ${
        isDark
          ? "border-[#363a45] bg-[#2a2e39] text-[#d1d4dc]"
          : "border-gray-300 bg-white text-gray-800"
      }`}
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

      <div className={`mx-0.5 h-5 w-px ${isDark ? "bg-[#434651]" : "bg-gray-300"}`} />

      <select
        aria-label="Annotation kind"
        title="Annotation kind"
        value={metadata?.kind ?? ""}
        onChange={(e) => {
          const value = e.target.value;
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
        className={selectClass}
      >
        <option value="">No kind</option>
        {ANNOTATION_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {ANNOTATION_KIND_FULL_LABELS[kind]}
          </option>
        ))}
      </select>

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
          className={`h-7 min-w-[8rem] max-w-[12rem] flex-1 rounded border px-2 text-xs ${
            isDark
              ? "border-[#434651] bg-[#131722] text-[#d1d4dc] placeholder:text-[#5A5E73]"
              : "border-gray-300 bg-white text-gray-800"
          }`}
        />
      )}

      {isAiProposal && (
        <>
          <button
            type="button"
            className={`${btnClass} text-[#00FF88] hover:text-[#00FF88]/80`}
            title="Accept AI proposal"
            aria-label="Accept AI proposal"
            onClick={onAcceptProposal}
          >
            Accept
          </button>
          <button
            type="button"
            className={`${btnClass} text-orange-400 hover:text-orange-300`}
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

          <select
            aria-label="Line width"
            title="Line width"
            value={styles.lineWidth ?? 1.5}
            onChange={(e) => onStyleChange({ lineWidth: Number(e.target.value) })}
            className={`h-7 rounded border px-1 text-xs ${
              isDark
                ? "border-[#434651] bg-[#131722] text-[#d1d4dc]"
                : "border-gray-300 bg-white text-gray-800"
            }`}
          >
            {LINE_WIDTHS.map((w) => (
              <option key={w} value={w}>
                {w}px
              </option>
            ))}
          </select>
        </>
      )}

      {caps.showDash && (
        <select
          aria-label="Line style"
          title="Line style"
          value={dashPreset}
          onChange={(e) => setDash(e.target.value as LineDashPreset)}
          className={`h-7 rounded border px-1 text-xs ${
            isDark
              ? "border-[#434651] bg-[#131722] text-[#d1d4dc]"
              : "border-gray-300 bg-white text-gray-800"
          }`}
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      )}

      <div className={`mx-0.5 h-5 w-px ${isDark ? "bg-[#434651]" : "bg-gray-300"}`} />

      <button type="button" className={btnClass} title="Settings" aria-label="Settings" onClick={onOpenSettings}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
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

      <button type="button" className={`${btnClass} text-red-400 hover:text-red-300`} title="Delete" aria-label="Delete drawing" onClick={onDelete}>
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
