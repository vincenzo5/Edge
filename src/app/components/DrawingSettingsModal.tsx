"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DrawingStyles, SerializedDrawing, Theme } from "@/lib/chart/contracts";
import { resolveDrawingStyles } from "@/lib/chart/drawingStyles";
import {
  dashPresetFromArray,
  drawingSettingsCapabilities,
  LINE_DASH_PRESETS,
  type LineDashPreset,
} from "@/lib/chart/drawingSettingsCapabilities";
import { EdgeButton, EdgeModalShell } from "./design-system";

type Props = {
  open: boolean;
  drawing: SerializedDrawing | null;
  theme: Theme;
  onClose: () => void;
  onSave: (id: string, patch: Partial<DrawingStyles>) => void;
};

const fieldClass =
  "rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1 text-sm text-[var(--edge-text-primary)]";

const labelClass = "text-[var(--edge-text-secondary)]";

export default function DrawingSettingsModal({
  open,
  drawing,
  theme,
  onClose,
  onSave,
}: Props) {
  const resolved = useMemo(() => {
    if (!drawing) return null;
    return resolveDrawingStyles(drawing, theme, false);
  }, [drawing, theme]);

  const caps = useMemo(
    () => drawingSettingsCapabilities(drawing?.name ?? ""),
    [drawing?.name],
  );

  const [lineColor, setLineColor] = useState(resolved?.lineColor ?? "#64748b");
  const [lineWidth, setLineWidth] = useState(resolved?.lineWidth ?? 1.5);
  const [dashPreset, setDashPreset] = useState<LineDashPreset>("solid");
  const [extendLeft, setExtendLeft] = useState(false);
  const [extendRight, setExtendRight] = useState(false);
  const [fillColor, setFillColor] = useState("#3b82f6");
  const [fillOpacity, setFillOpacity] = useState(0);
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(12);
  const [stickEntryToLastPrice, setStickEntryToLastPrice] = useState(true);

  useEffect(() => {
    if (!resolved) return;
    setLineColor(resolved.lineColor ?? "#64748b");
    setLineWidth(resolved.lineWidth ?? 1.5);
    setDashPreset(dashPresetFromArray(resolved.lineDash));
    setExtendLeft(resolved.extendLeft ?? false);
    setExtendRight(resolved.extendRight ?? false);
    setFillColor(resolved.fillColor ?? "#3b82f6");
    setFillOpacity(resolved.fillOpacity ?? 0);
    setText(resolved.text ?? drawing?.label ?? "");
    setFontSize(resolved.fontSize ?? 12);
    setStickEntryToLastPrice(resolved.stickEntryToLastPrice !== false);
  }, [resolved, drawing?.label]);

  const handleSave = useCallback(() => {
    if (!drawing?.id) return;
    const patch: Partial<DrawingStyles> = {
      lineColor,
      lineWidth: Number.isFinite(lineWidth) ? lineWidth : 1.5,
    };
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
    caps.showStickEntryToLastPrice,
    caps.showText,
    dashPreset,
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
    stickEntryToLastPrice,
    text,
  ]);

  if (!open || !drawing || !resolved) return null;

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
      <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
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
                className={fieldClass}
              />
            </label>
          </>
        )}

        {caps.showDash && (
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelClass}>Line style</span>
            <select
              value={dashPreset}
              onChange={(e) => setDashPreset(e.target.value as LineDashPreset)}
              className={fieldClass}
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
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
                className={fieldClass}
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
                className={fieldClass}
              />
            </label>
          </>
        )}
      </div>
    </EdgeModalShell>
  );
}
