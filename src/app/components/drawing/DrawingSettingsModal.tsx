"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DrawingStyles, SerializedDrawing, Theme } from "@edge/chart-core/contracts";
import {
  clampMinLevelDistance,
  directionFromPositionDrawing,
  readPositionSettingsDraft,
  type PositionOrderLevelsPatch,
  type PositionSettingsDraft,
} from "@edge/chart-core";
import { resolveDrawingStyles } from "@edge/chart-core/drawingStyles";
import {
  dashPresetFromArray,
  drawingSettingsCapabilities,
  LINE_DASH_PRESETS,
  type LineDashPreset,
} from "@edge/chart-core/drawingSettingsCapabilities";
import { EdgeButton, EdgeModalShell, EdgeSelect, EdgeUnderlineTabs } from "../design-system";
import { fieldClass } from "../design-system/styles";
import PositionDrawingInputs from "./PositionDrawingInputs";

type SettingsTab = "inputs" | "style" | "visibility";

type Props = {
  open: boolean;
  drawing: SerializedDrawing | null;
  theme: Theme;
  onClose: () => void;
  onSave: (id: string, patch: Partial<DrawingStyles>) => void;
  onSaveLevels?: (id: string, levels: PositionOrderLevelsPatch) => void;
};

const labelClass = "text-[var(--edge-text-secondary)]";
const inputClass = fieldClass({ density: "compact" });

const POSITION_TABS = [
  { id: "inputs", label: "Inputs" },
  { id: "style", label: "Style" },
  { id: "visibility", label: "Visibility" },
] as const;

export default function DrawingSettingsModal({
  open,
  drawing,
  theme,
  onClose,
  onSave,
  onSaveLevels,
}: Props) {
  const resolved = useMemo(() => {
    if (!drawing) return null;
    return resolveDrawingStyles(drawing, theme, false);
  }, [drawing, theme]);

  const caps = useMemo(
    () => drawingSettingsCapabilities(drawing?.name ?? ""),
    [drawing?.name],
  );

  const direction = useMemo(
    () => (drawing ? directionFromPositionDrawing(drawing) : null),
    [drawing],
  );

  const [tab, setTab] = useState<SettingsTab>("inputs");
  const [lineColor, setLineColor] = useState(resolved?.lineColor ?? "#64748b");
  const [lineWidth, setLineWidth] = useState(resolved?.lineWidth ?? 1.5);
  const [dashPreset, setDashPreset] = useState<LineDashPreset>("solid");
  const [extendLeft, setExtendLeft] = useState(false);
  const [extendRight, setExtendRight] = useState(false);
  const [fillColor, setFillColor] = useState("#3b82f6");
  const [fillOpacity, setFillOpacity] = useState(0);
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(12);
  const [stickEntryToLastPrice, setStickEntryToLastPrice] = useState(false);
  const [positionDraft, setPositionDraft] = useState<PositionSettingsDraft | null>(null);

  useEffect(() => {
    if (!resolved || !drawing) return;
    setTab("inputs");
    setLineColor(resolved.lineColor ?? "#64748b");
    setLineWidth(resolved.lineWidth ?? 1.5);
    setDashPreset(dashPresetFromArray(resolved.lineDash));
    setExtendLeft(resolved.extendLeft ?? false);
    setExtendRight(resolved.extendRight ?? false);
    setFillColor(resolved.fillColor ?? "#3b82f6");
    setFillOpacity(resolved.fillOpacity ?? 0);
    setText(resolved.text ?? drawing.label ?? "");
    setFontSize(resolved.fontSize ?? 12);
    setStickEntryToLastPrice(resolved.stickEntryToLastPrice === true);
    setPositionDraft(
      caps.showPositionInputs ? readPositionSettingsDraft(drawing) : null,
    );
  }, [resolved, drawing, caps.showPositionInputs]);

  const handleSave = useCallback(() => {
    if (!drawing?.id) return;
    const patch: Partial<DrawingStyles> = {};

    if (caps.showPositionInputs && positionDraft && direction) {
      const levels = clampMinLevelDistance(positionDraft, direction);
      if (!levels) return;
      onSaveLevels?.(drawing.id, {
        entry: levels.entry,
        stop: levels.stop,
        target: levels.target,
      });
      patch.riskPercent = positionDraft.riskPercent;
      if (caps.showStickEntryToLastPrice) {
        patch.stickEntryToLastPrice = stickEntryToLastPrice;
      }
      onSave(drawing.id, patch);
      onClose();
      return;
    }

    patch.lineColor = lineColor;
    patch.lineWidth = Number.isFinite(lineWidth) ? lineWidth : 1.5;
    if (caps.showDash) {
      patch.lineDash = LINE_DASH_PRESETS[dashPreset];
    }
    if (caps.showExtend) {
      patch.extendLeft = extendLeft;
      patch.extendRight = extendRight;
    }
    if (caps.showFill) {
      patch.fillColor = fillColor;
      patch.fillOpacity = Math.max(0, Math.min(1, fillOpacity));
    }
    if (caps.showText) {
      patch.text = text.trim() || drawing.label;
      patch.fontSize = Number.isFinite(fontSize) ? fontSize : 12;
    }
    if (caps.showStickEntryToLastPrice) {
      patch.stickEntryToLastPrice = stickEntryToLastPrice;
    }
    onSave(drawing.id, patch);
    onClose();
  }, [
    caps.showDash,
    caps.showExtend,
    caps.showFill,
    caps.showPositionInputs,
    caps.showStickEntryToLastPrice,
    caps.showText,
    dashPreset,
    direction,
    drawing,
    extendLeft,
    extendRight,
    fillColor,
    fillOpacity,
    fontSize,
    lineColor,
    lineWidth,
    onClose,
    onSave,
    onSaveLevels,
    positionDraft,
    stickEntryToLastPrice,
    text,
  ]);

  if (!open || !drawing || !resolved) return null;

  const styleFields = (
    <>
      {caps.showStickEntryToLastPrice && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={stickEntryToLastPrice}
            onChange={(e) => setStickEntryToLastPrice(e.target.checked)}
          />
          <span className={labelClass}>Stick entry to last price</span>
        </label>
      )}

      {caps.showLine && (
        <>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className={labelClass}>Line color</span>
            <input
              type="color"
              value={lineColor}
              onChange={(e) => setLineColor(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-[var(--edge-border)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelClass}>Line width</span>
            <input
              type="number"
              min={0.5}
              max={8}
              step={0.5}
              value={lineWidth}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                if (Number.isFinite(parsed)) setLineWidth(parsed);
              }}
              className={inputClass}
            />
          </label>
        </>
      )}

      {caps.showDash && (
        <label className="flex flex-col gap-1 text-sm">
          <span className={labelClass}>Line style</span>
          <EdgeSelect
            variant="field"
            density="compact"
            value={dashPreset}
            onChange={(next) => setDashPreset(next as LineDashPreset)}
            options={[
              { value: "solid", label: "Solid" },
              { value: "dashed", label: "Dashed" },
              { value: "dotted", label: "Dotted" },
            ]}
            className="w-full"
          />
        </label>
      )}

      {caps.showExtend && (
        <div className="flex flex-col gap-2 text-sm">
          <span className={labelClass}>Extend</span>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={extendLeft}
              onChange={(e) => setExtendLeft(e.target.checked)}
            />
            Extend left
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={extendRight}
              onChange={(e) => setExtendRight(e.target.checked)}
            />
            Extend right
          </label>
        </div>
      )}

      {caps.showFill && (
        <>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className={labelClass}>Fill color</span>
            <input
              type="color"
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-[var(--edge-border)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelClass}>
              Fill opacity ({Math.round(fillOpacity * 100)}%)
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={fillOpacity}
              onChange={(e) => setFillOpacity(Number(e.target.value))}
            />
          </label>
        </>
      )}

      {caps.showText && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelClass}>Text</span>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelClass}>Font size</span>
            <input
              type="number"
              min={8}
              max={32}
              step={1}
              value={fontSize}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                if (Number.isFinite(parsed)) setFontSize(parsed);
              }}
              className={inputClass}
            />
          </label>
        </>
      )}
    </>
  );

  return (
    <EdgeModalShell
      open={open}
      title={`${drawing.label} Settings`}
      onClose={onClose}
      maxWidth="sm"
      align="center"
      footer={
        <div className="flex justify-end gap-2 px-4 py-3">
          <EdgeButton variant="secondary" onClick={onClose}>
            Cancel
          </EdgeButton>
          <EdgeButton variant="primary" onClick={handleSave}>
            Save
          </EdgeButton>
        </div>
      }
    >
      {caps.showPositionInputs ? (
        <div className="flex flex-col">
          <div className="border-b border-[var(--edge-border)] px-4 pt-1">
            <EdgeUnderlineTabs
              segments={[...POSITION_TABS]}
              value={tab}
              onChange={(id) => setTab(id as SettingsTab)}
              layout="content"
            />
          </div>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
            {tab === "inputs" && positionDraft && direction ? (
              <PositionDrawingInputs
                draft={positionDraft}
                direction={direction}
                onChange={(next) => {
                  if (
                    Math.abs(next.entry - positionDraft.entry) >= 1e-12
                  ) {
                    setStickEntryToLastPrice(false);
                  }
                  setPositionDraft(next);
                }}
              />
            ) : null}
            {tab === "style" ? (
              <div className="space-y-3">
                {caps.showStickEntryToLastPrice && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={stickEntryToLastPrice}
                      onChange={(e) => setStickEntryToLastPrice(e.target.checked)}
                    />
                    <span className={labelClass}>Stick entry to last price</span>
                  </label>
                )}
              </div>
            ) : null}
            {tab === "visibility" ? (
              <p className="text-sm text-[var(--edge-text-muted)]">
                Visibility controls coming soon.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">{styleFields}</div>
      )}
    </EdgeModalShell>
  );
}
