"use client";

import type { Theme } from "@/lib/chartConfig";
import type { PatternSection } from "@/lib/patternLibrary/types";
import EdgeButton from "../design-system/EdgeButton";
import { getShortcutLabel } from "@/lib/shortcuts/formatShortcutLabel";
import { SECTION_LABEL_PRESETS } from "@/lib/patternCapture/presets";
import type { CapturePhase } from "@/lib/patternCapture/fsm";

type Props = {
  theme: Theme;
  phase: CapturePhase;
  hasPendingStart: boolean;
  sections: PatternSection[];
  labelDraft: string;
  error: string | null;
  canSave: boolean;
  canUndo: boolean;
  saving: boolean;
  saveMessage: string | null;
  savedRecordId?: string | null;
  onViewInPatterns?: () => void;
  onLabelDraftChange: (label: string) => void;
  onConfirmLabel: () => void;
  onPickPreset: (index: number) => void;
  onUndo: () => void;
  onCancel: () => void;
  onSave: () => void;
};

function phaseLabel(phase: CapturePhase, hasPendingStart: boolean): string {
  switch (phase) {
    case "capturing":
      return hasPendingStart
        ? "Click section end (same bar = 1-bar)"
        : "Click section start";
    case "labeling":
      return "Label this section — press 1–N or type";
    case "ready_to_save":
      return "Sections ready — save or add another";
    case "saving":
      return "Saving to pattern library…";
    default:
      return "";
  }
}

export default function PatternCapturePanel({
  theme,
  phase,
  hasPendingStart,
  sections,
  labelDraft,
  error,
  canSave,
  canUndo,
  saving,
  saveMessage,
  savedRecordId,
  onViewInPatterns,
  onLabelDraftChange,
  onConfirmLabel,
  onPickPreset,
  onUndo,
  onCancel,
  onSave,
}: Props) {
  if (phase === "idle") return null;

  const showLabelInput = phase === "labeling";

  return (
    <div
      className="pointer-events-auto absolute bottom-3 left-1/2 z-30 w-[min(420px,calc(100%-24px))] -translate-x-1/2 rounded-md border border-[var(--edge-border-strong)] bg-[var(--edge-surface-elevated)] p-3 shadow-lg"
      data-testid="pattern-capture-panel"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--edge-text-muted)]">
            Pattern capture
          </div>
          <div className="text-sm text-[var(--edge-text-primary)]">
            {phaseLabel(phase, hasPendingStart)}
          </div>
        </div>
        <div className="text-xs tabular-nums text-[var(--edge-text-muted)]">
          {sections.length} section{sections.length === 1 ? "" : "s"}
        </div>
      </div>

      {sections.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {sections.map((section) => (
            <span
              key={section.id}
              className="rounded px-1.5 py-0.5 text-xs bg-[var(--edge-surface-muted)] text-[var(--edge-text-secondary)]"
            >
              {section.label}
            </span>
          ))}
        </div>
      ) : null}

      {showLabelInput ? (
        <div className="mb-2 space-y-2">
          <input
            type="text"
            value={labelDraft}
            onChange={(e) => onLabelDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onConfirmLabel();
                return;
              }
              const digit = Number.parseInt(e.key, 10);
              if (
                digit >= 1 &&
                digit <= SECTION_LABEL_PRESETS.length &&
                !e.metaKey &&
                !e.ctrlKey &&
                !e.altKey
              ) {
                e.preventDefault();
                onPickPreset(digit);
              }
            }}
            placeholder="Type a label or press 1–N"
            className="w-full rounded border border-[var(--edge-border)] bg-[var(--edge-surface-chart)] px-2 py-1.5 text-sm text-[var(--edge-text-primary)] outline-none focus:border-[var(--edge-accent)]"
            autoFocus
          />
          <div className="flex flex-wrap gap-1">
            {SECTION_LABEL_PRESETS.map((preset, index) => (
              <button
                key={preset}
                type="button"
                onClick={() => onPickPreset(index + 1)}
                className="rounded px-1.5 py-0.5 text-xs bg-[var(--edge-surface-muted)] text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)]"
              >
                <span className="mr-1 font-mono tabular-nums text-[var(--edge-text-muted)]">
                  {index + 1}
                </span>
                {preset}
              </button>
            ))}
          </div>
          <EdgeButton theme={theme} variant="primary" onClick={onConfirmLabel}>
            Confirm label
          </EdgeButton>
        </div>
      ) : null}

      {error ? (
        <div className="mb-2 text-xs text-[var(--edge-danger)]">{error}</div>
      ) : null}
      {saveMessage ? (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--edge-success)]">
          <span>{saveMessage}</span>
          {savedRecordId && onViewInPatterns ? (
            <button
              type="button"
              onClick={onViewInPatterns}
              className="underline decoration-dotted underline-offset-2 hover:text-[var(--edge-text-primary)]"
            >
              View in Patterns
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <EdgeButton theme={theme} onClick={onUndo} disabled={!canUndo || saving}>
          Undo {getShortcutLabel("patternCaptureUndo")}
        </EdgeButton>
        <EdgeButton theme={theme} onClick={onCancel} disabled={saving}>
          Cancel
        </EdgeButton>
        <EdgeButton
          theme={theme}
          variant="primary"
          onClick={onSave}
          disabled={!canSave || saving}
        >
          Save {getShortcutLabel("patternCaptureSave")}
        </EdgeButton>
      </div>
    </div>
  );
}
