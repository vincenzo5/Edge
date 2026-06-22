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

type Props = {
  open: boolean;
  drawing: SerializedDrawing | null;
  theme: Theme;
  onClose: () => void;
  onSave: (id: string, patch: Partial<DrawingStyles>) => void;
};

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
    onSave(drawing.id, patch);
    onClose();
  }, [
    caps.showDash,
    caps.showExtend,
    caps.showFill,
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
    text,
  ]);

  if (!open || !drawing || !resolved) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">{drawing.label} Settings</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {caps.showLine && (
            <>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-600 dark:text-gray-400">Line color</span>
                <input
                  type="color"
                  value={lineColor}
                  onChange={(e) => setLineColor(e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600 dark:text-gray-400">Line width</span>
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
                  className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
                />
              </label>
            </>
          )}

          {caps.showDash && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600 dark:text-gray-400">Line style</span>
              <select
                value={dashPreset}
                onChange={(e) => setDashPreset(e.target.value as LineDashPreset)}
                className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </label>
          )}

          {caps.showExtend && (
            <div className="flex flex-col gap-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">Extend</span>
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
                <span className="text-gray-600 dark:text-gray-400">Fill color</span>
                <input
                  type="color"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600 dark:text-gray-400">
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
                <span className="text-gray-600 dark:text-gray-400">Text</span>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600 dark:text-gray-400">Font size</span>
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
                  className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
                />
              </label>
            </>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
