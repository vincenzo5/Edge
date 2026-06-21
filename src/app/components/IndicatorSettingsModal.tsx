"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { IndicatorConfig } from "@/lib/chartConfig";
import { IndicatorRegistry } from "@/lib/chart/pluginHost";
import type { ParamDef } from "@/lib/chart/plugin-api";

type Props = {
  open: boolean;
  indicator: IndicatorConfig | null;
  onClose: () => void;
  onSave: (id: string, params: Record<string, number>) => void;
};

function clampParam(value: number, def: ParamDef): number {
  let v = value;
  if (def.min != null) v = Math.max(def.min, v);
  if (def.max != null) v = Math.min(def.max, v);
  if (def.step != null && def.step > 0) {
    const base = def.min ?? 0;
    v = base + Math.round((v - base) / def.step) * def.step;
  }
  return v;
}

export default function IndicatorSettingsModal({
  open,
  indicator,
  onClose,
  onSave,
}: Props) {
  const plugin = indicator ? IndicatorRegistry.get(indicator.name) : undefined;
  const schema = plugin?.paramSchema;

  const initialValues = useMemo(() => {
    if (!indicator || !schema) return {};
    const merged = { ...plugin?.defaultParams, ...indicator.params };
    const out: Record<string, number> = {};
    for (const key of Object.keys(schema)) {
      out[key] = merged[key] ?? schema[key].default;
    }
    return out;
  }, [indicator, plugin?.defaultParams, schema]);

  const [values, setValues] = useState<Record<string, number>>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleSave = useCallback(() => {
    if (!indicator || !schema) return;
    const clamped: Record<string, number> = {};
    for (const [key, def] of Object.entries(schema)) {
      clamped[key] = clampParam(values[key] ?? def.default, def);
    }
    onSave(indicator.id, clamped);
    onClose();
  }, [indicator, onClose, onSave, schema, values]);

  if (!open || !indicator || !schema || Object.keys(schema).length === 0) {
    return null;
  }

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
          <h3 className="text-base font-semibold">{indicator.name} Settings</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {Object.entries(schema).map(([key, def]) => (
            <label key={key} className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600 dark:text-gray-400">{def.label}</span>
              <input
                type="number"
                value={values[key] ?? def.default}
                min={def.min}
                max={def.max}
                step={def.step ?? 1}
                onChange={(e) => {
                  const parsed = Number(e.target.value);
                  if (Number.isFinite(parsed)) {
                    setValues((prev) => ({ ...prev, [key]: parsed }));
                  }
                }}
                className="rounded border border-gray-300 bg-transparent px-2 py-1 font-mono text-sm dark:border-gray-600"
              />
            </label>
          ))}
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
