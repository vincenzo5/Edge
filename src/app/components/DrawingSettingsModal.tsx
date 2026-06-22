"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DrawingStyles, SerializedDrawing, Theme } from "@/lib/chart/contracts";
import { resolveDrawingStyles } from "@/lib/chart/drawingStyles";

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

  const [lineColor, setLineColor] = useState(resolved?.lineColor ?? "#64748b");
  const [lineWidth, setLineWidth] = useState(resolved?.lineWidth ?? 1.5);

  useEffect(() => {
    if (!resolved) return;
    setLineColor(resolved.lineColor ?? "#64748b");
    setLineWidth(resolved.lineWidth ?? 1.5);
  }, [resolved]);

  const handleSave = useCallback(() => {
    if (!drawing?.id) return;
    onSave(drawing.id, {
      lineColor,
      lineWidth: Number.isFinite(lineWidth) ? lineWidth : 1.5,
    });
    onClose();
  }, [drawing, lineColor, lineWidth, onClose, onSave]);

  if (!open || !drawing || !resolved) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900"
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
