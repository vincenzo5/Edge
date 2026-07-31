"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { SerializedDrawing } from "@edge/chart-core/contracts";
import { EdgeButton } from "../design-system";
import { fieldClass } from "../design-system/styles";
import { useRiskSettingsOptional } from "../RiskSettingsProvider";
import { computePositionRiskPreview } from "@/lib/risk/computePositionRiskPreview";
import { CLASSIC_PROTECT_TEMPLATE_ID } from "@/lib/risk/policy/classicProtectTemplate";
import {
  directionFromDrawingName,
  isPositionDrawingName,
} from "@/lib/trading/positionTradeSetup";
import type { PlaybookTemplate } from "@/lib/trading/playbook/types";
import {
  resolvePlanPanelPosition,
  type ToolbarAnchorRect,
} from "./drawingSelectionToolbarPosition";

type PolicyChip = { label: string; ok: boolean };

type Props = {
  drawing: SerializedDrawing;
  toolbarAnchor: ToolbarAnchorRect;
  containerWidth: number;
  containerHeight: number;
  dragOffset: { x: number; y: number };
  onDragOffsetChange: (offset: { x: number; y: number }) => void;
  onGeometryChange: (levels: { entry: number; stop: number; target: number }) => void;
  policyTemplates?: PlaybookTemplate[];
  selectedPolicyId?: string | null;
  policyChips?: PolicyChip[];
  policyLoading?: boolean;
  policyError?: string | null;
  onPolicyChange?: (templateId: string | null) => void;
  onTradeSetup?: () => void;
  onPausePolicy?: () => void;
  onDetachPolicy?: () => void;
  policyControlVisible?: boolean;
};

type PriceField = "entry" | "stop" | "target";

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatPrice(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatRatio(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

function parsePriceInput(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function PlanPanelGripIcon() {
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

export default function PositionPlanPanel({
  drawing,
  toolbarAnchor,
  containerWidth,
  containerHeight,
  dragOffset,
  onDragOffsetChange,
  onGeometryChange,
  policyTemplates = [],
  selectedPolicyId = null,
  policyChips = [],
  policyLoading = false,
  policyError = null,
  onPolicyChange,
  onTradeSetup,
  onPausePolicy,
  onDetachPolicy,
  policyControlVisible = false,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [size, setSize] = useState({ width: 200, height: 160 });
  const riskSettings = useRiskSettingsOptional();
  const dollarRisk = riskSettings?.dollarRisk ?? null;

  const preview = useMemo(
    () => computePositionRiskPreview(drawing, dollarRisk),
    [drawing, dollarRisk],
  );

  const [drafts, setDrafts] = useState({ entry: "", stop: "", target: "" });
  const [focused, setFocused] = useState<Record<PriceField, boolean>>({
    entry: false,
    stop: false,
    target: false,
  });

  useEffect(() => {
    if (!preview) return;
    setDrafts((prev) => ({
      entry: focused.entry ? prev.entry : formatPrice(preview.entry),
      stop: focused.stop ? prev.stop : formatPrice(preview.stop),
      target: focused.target ? prev.target : formatPrice(preview.target),
    }));
  }, [preview, focused, drawing.id]);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ width: el.offsetWidth, height: el.offsetHeight });
    });
    ro.observe(el);
    setSize({ width: el.offsetWidth, height: el.offsetHeight });
    return () => ro.disconnect();
  }, [drawing.id, preview]);

  const panelPosition = useMemo(
    () =>
      resolvePlanPanelPosition({
        toolbarAnchor,
        panel: size,
        container: { width: containerWidth, height: containerHeight },
        dragOffset,
      }),
    [toolbarAnchor, size, containerWidth, containerHeight, dragOffset],
  );

  const handleGripPointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        ox: dragOffset.x,
        oy: dragOffset.y,
      };
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    },
    [dragOffset.x, dragOffset.y],
  );

  const handleGripPointerMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (!dragStartRef.current) return;
      const dx = event.clientX - dragStartRef.current.x;
      const dy = event.clientY - dragStartRef.current.y;
      onDragOffsetChange({
        x: dragStartRef.current.ox + dx,
        y: dragStartRef.current.oy + dy,
      });
    },
    [onDragOffsetChange],
  );

  const handleGripPointerUp = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    dragStartRef.current = null;
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  if (!isPositionDrawingName(drawing.name) || preview == null) {
    return null;
  }

  const direction = directionFromDrawingName(drawing.name);
  const directionLabel = direction === "short" ? "Short" : "Long";

  function commitField(field: PriceField) {
    if (!preview) return;
    const parsed = parsePriceInput(drafts[field]);
    if (parsed == null) {
      setDrafts((prev) => ({
        ...prev,
        [field]: formatPrice(preview[field]),
      }));
      return;
    }
    onGeometryChange({
      entry: field === "entry" ? parsed : preview.entry,
      stop: field === "stop" ? parsed : preview.stop,
      target: field === "target" ? parsed : preview.target,
    });
  }

  function handleBlur(field: PriceField) {
    setFocused((prev) => ({ ...prev, [field]: false }));
    commitField(field);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, field: PriceField) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (!preview) return;
      setDrafts((prev) => ({
        ...prev,
        [field]: formatPrice(preview[field]),
      }));
      setFocused((prev) => ({ ...prev, [field]: false }));
      event.currentTarget.blur();
    }
  }

  const inputClass = `${fieldClass} h-7 min-w-0 flex-1 px-1.5 py-0 text-[11px] tabular-nums`;

  const policyOptions = useMemo(() => {
    const builtins = policyTemplates.filter((item) => !item.id.startsWith("user_"));
    const hasClassic = builtins.some((item) => item.id === CLASSIC_PROTECT_TEMPLATE_ID);
    const options = hasClassic
      ? builtins
      : [
          {
            id: CLASSIC_PROTECT_TEMPLATE_ID,
            name: "Classic Protect",
            rules: [],
          } as PlaybookTemplate,
          ...builtins,
        ];
    return options;
  }, [policyTemplates]);

  return (
    <div
      ref={panelRef}
      role="form"
      aria-label="Position plan"
      data-testid="position-plan-panel"
      className="pointer-events-auto absolute z-30 w-[220px] rounded-md border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] px-2 py-1.5 text-[10px] text-[var(--edge-text-secondary)] shadow-[var(--edge-shadow-popover)]"
      style={{ left: panelPosition.left, top: panelPosition.top }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Drag plan panel"
          data-testid="position-plan-drag-handle"
          className="inline-flex h-6 w-5 shrink-0 cursor-grab items-center justify-center rounded text-[var(--edge-text-muted)] transition-colors hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)] active:cursor-grabbing"
          onPointerDown={handleGripPointerDown}
          onPointerMove={handleGripPointerMove}
          onPointerUp={handleGripPointerUp}
          onPointerCancel={handleGripPointerUp}
        >
          <PlanPanelGripIcon />
        </button>
        <span className="font-medium uppercase tracking-wide text-[var(--edge-text-tertiary)]">
          Plan
        </span>
        <span className="ml-auto text-[var(--edge-text-muted)]">{directionLabel}</span>
      </div>

      <div className="space-y-1">
        {(["entry", "stop", "target"] as const).map((field) => (
          <label
            key={field}
            className="flex items-center gap-2 capitalize text-[var(--edge-text-tertiary)]"
          >
            <span className="w-11 shrink-0">{field}</span>
            <input
              type="text"
              inputMode="decimal"
              aria-label={`${field} price`}
              data-testid={`position-plan-${field}`}
              className={inputClass}
              value={drafts[field]}
              onChange={(event) =>
                setDrafts((prev) => ({ ...prev, [field]: event.target.value }))
              }
              onFocus={() =>
                setFocused((prev) => ({ ...prev, [field]: true }))
              }
              onBlur={() => handleBlur(field)}
              onKeyDown={(event) => handleKeyDown(event, field)}
            />
          </label>
        ))}
      </div>

      <div
        className="mt-1.5 space-y-0.5 border-t border-[var(--edge-border-subtle)] pt-1.5 text-[var(--edge-text-muted)]"
        aria-label="Derived position metrics"
      >
        <div className="flex justify-between gap-2">
          <span>R</span>
          <span className="tabular-nums text-[var(--edge-text-primary)]">
            {formatPrice(preview.rUnit)}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span>R:R</span>
          <span className="tabular-nums text-[var(--edge-text-primary)]">
            {formatRatio(preview.riskRewardRatio)}
          </span>
        </div>
        {preview.sizing ? (
          <>
            <div className="flex justify-between gap-2">
              <span>Risk</span>
              <span className="tabular-nums text-[var(--edge-text-primary)]">
                {formatMoney(preview.sizing.plannedRiskDollars)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Qty</span>
              <span className="tabular-nums text-[var(--edge-text-primary)]">
                {preview.sizing.shares.toLocaleString()}
              </span>
            </div>
          </>
        ) : (
          <p className="text-[var(--edge-text-muted)]">Set budget in Risk</p>
        )}
      </div>

      {onPolicyChange ? (
        <div
          className="mt-1.5 space-y-1 border-t border-[var(--edge-border-subtle)] pt-1.5"
          data-testid="position-plan-policy"
        >
          <label className="block">
            <span className="text-[var(--edge-text-tertiary)]">Policy</span>
            <select
              className={`mt-0.5 ${fieldClass} h-7 w-full px-1.5 text-[11px]`}
              value={selectedPolicyId ?? ""}
              disabled={policyLoading}
              onChange={(event) => {
                const value = event.target.value;
                onPolicyChange(value === "" ? null : value);
              }}
              data-testid="position-plan-policy-select"
            >
              <option value="">None</option>
              {policyOptions.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>

          {policyChips.length > 0 ? (
            <div className="flex flex-wrap gap-1" data-testid="position-plan-policy-chips">
              {policyChips.map((chip) => (
                <span
                  key={chip.label}
                  className={
                    chip.ok
                      ? "rounded bg-[var(--edge-positive-subtle)] px-1 py-0.5 text-[9px] text-[var(--edge-positive)]"
                      : "rounded bg-[var(--edge-warning-subtle)] px-1 py-0.5 text-[9px] text-[var(--edge-warning)]"
                  }
                >
                  {chip.ok ? "✓" : "!"} {chip.label}
                </span>
              ))}
            </div>
          ) : null}

          {policyError ? (
            <p className="text-[9px] text-[var(--edge-negative)]" role="alert">
              {policyError}
            </p>
          ) : null}

          {onTradeSetup ? (
            <EdgeButton
              type="button"
              variant="secondary"
              className="h-7 w-full text-[10px]"
              disabled={!selectedPolicyId || policyLoading}
              onClick={onTradeSetup}
              data-testid="position-plan-trade-setup"
            >
              Trade setup…
            </EdgeButton>
          ) : null}

          {policyControlVisible ? (
            <div className="flex gap-1">
              {onPausePolicy ? (
                <EdgeButton
                  type="button"
                  variant="secondary"
                  className="h-7 flex-1 text-[10px]"
                  onClick={onPausePolicy}
                >
                  Pause
                </EdgeButton>
              ) : null}
              {onDetachPolicy ? (
                <EdgeButton
                  type="button"
                  variant="secondary"
                  className="h-7 flex-1 text-[10px]"
                  onClick={onDetachPolicy}
                >
                  Detach
                </EdgeButton>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
