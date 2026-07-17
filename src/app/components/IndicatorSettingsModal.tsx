"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { IndicatorConfig, LineStyleOverride } from "@/lib/chartConfig";
import { IndicatorRegistry } from "@/lib/chart/pluginHost";
import type { InputValue, ParamDef } from "@/lib/chart/plugin-api";
import {
  clampInputValue,
  getInputSchema,
  resolveIndicatorInputs,
} from "@/lib/chart/indicatorInputs";
import { resolveOutputColor } from "@/lib/chart/indicatorCompute";
import { EdgeButton, EdgeModalShell, EdgeSegmentedTabs } from "./design-system";

type Tab = "inputs" | "style";

type Props = {
  open: boolean;
  indicator: IndicatorConfig | null;
  theme?: "light" | "dark";
  onClose: () => void;
  onSave: (
    id: string,
    patch: { inputs?: Record<string, InputValue>; styles?: Record<string, LineStyleOverride> },
  ) => void;
  onSaveAsTemplate?: () => void;
};

const fieldClass =
  "rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1 text-sm text-[var(--edge-text-primary)]";

const labelClass = "text-[var(--edge-text-secondary)]";

function clampParamValue(value: InputValue, def: ParamDef): InputValue {
  return clampInputValue(value, def);
}

export default function IndicatorSettingsModal({
  open,
  indicator,
  theme = "dark",
  onClose,
  onSave,
  onSaveAsTemplate,
}: Props) {
  const plugin = indicator ? IndicatorRegistry.get(indicator.name) : undefined;
  const schema = plugin ? getInputSchema(plugin) : undefined;

  const initialInputs = useMemo(() => {
    if (!indicator || !plugin) return {};
    return resolveIndicatorInputs(plugin, indicator);
  }, [indicator, plugin]);

  const styleOutputs = useMemo(
    () => plugin?.outputs?.filter((o) => o.label && (o.plot ?? "line") !== "hline") ?? [],
    [plugin?.outputs],
  );

  const initialStyles = useMemo(() => {
    if (!indicator || !plugin || styleOutputs.length === 0) return {};
    const out: Record<string, LineStyleOverride> = {};
    for (const output of styleOutputs) {
      const existing = indicator.styles?.[output.id];
      if (existing) {
        out[output.id] = { ...existing };
      }
    }
    return out;
  }, [indicator, plugin, styleOutputs]);

  const hasInputs = Boolean(schema && Object.keys(schema).length > 0);
  const hasStyles = styleOutputs.length > 0;

  const [inputValues, setInputValues] = useState<Record<string, InputValue>>(initialInputs);
  const [styleValues, setStyleValues] = useState<Record<string, LineStyleOverride>>(initialStyles);
  const [tab, setTab] = useState<Tab>("inputs");

  useEffect(() => {
    setInputValues(initialInputs);
    setStyleValues(initialStyles);
  }, [initialInputs, initialStyles]);

  useEffect(() => {
    if (!open) return;
    setTab(hasInputs ? "inputs" : "style");
  }, [open, hasInputs]);

  const handleSave = useCallback(() => {
    if (!indicator || !plugin) return;
    const clamped: Record<string, InputValue> = {};
    if (schema) {
      for (const [key, def] of Object.entries(schema)) {
        clamped[key] = clampParamValue(inputValues[key] ?? def.default, def);
      }
    }
    const styles: Record<string, LineStyleOverride> = {};
    for (const output of styleOutputs) {
      const patch = styleValues[output.id];
      if (!patch) continue;
      const cleaned: LineStyleOverride = {};
      if (patch.color) cleaned.color = patch.color;
      if (patch.lineWidth != null) cleaned.lineWidth = patch.lineWidth;
      if (Object.keys(cleaned).length > 0) styles[output.id] = cleaned;
    }
    onSave(indicator.id, {
      inputs: Object.keys(clamped).length > 0 ? clamped : undefined,
      styles: Object.keys(styles).length > 0 ? styles : undefined,
    });
    onClose();
  }, [indicator, onClose, onSave, plugin, schema, inputValues, styleOutputs, styleValues]);

  if (!open || !indicator || !plugin) {
    return null;
  }

  if (!hasInputs && !hasStyles) return null;

  return (
    <EdgeModalShell
      open={open}
      title={`${indicator.name} Settings`}
      onClose={onClose}
      maxWidth="sm"
      align="center"
      footer={
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          {onSaveAsTemplate ? (
            <EdgeButton variant="secondary" onClick={onSaveAsTemplate}>
              Save as template…
            </EdgeButton>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <EdgeButton variant="secondary" onClick={onClose}>
              Cancel
            </EdgeButton>
            <EdgeButton variant="primary" onClick={handleSave}>
              Save
            </EdgeButton>
          </div>
        </div>
      }
    >
      {hasInputs && hasStyles && (
        <div className="border-b border-[var(--edge-border)] px-4 py-2">
          <EdgeSegmentedTabs
            segments={[
              { id: "inputs", label: "Inputs" },
              { id: "style", label: "Style" },
            ]}
            value={tab}
            onChange={(id) => setTab(id as Tab)}
          />
        </div>
      )}

      <div className="max-h-[60vh] overflow-y-auto p-4">
        {hasInputs && (tab === "inputs" || !hasStyles) && (
          <div className="space-y-3">
            {Object.entries(schema!).map(([key, def]) => (
              <label key={key} className="flex flex-col gap-1 text-sm">
                <span className={labelClass}>{def.label}</span>
                {def.kind === "number" && (
                  <input
                    type="number"
                    value={Number(inputValues[key] ?? def.default)}
                    min={def.min}
                    max={def.max}
                    step={def.step ?? 1}
                    onChange={(e) => {
                      const parsed = Number(e.target.value);
                      if (Number.isFinite(parsed)) {
                        setInputValues((prev) => ({ ...prev, [key]: parsed }));
                      }
                    }}
                    className={`${fieldClass} font-mono`}
                  />
                )}
                {def.kind === "boolean" && (
                  <input
                    type="checkbox"
                    checked={Boolean(inputValues[key] ?? def.default)}
                    onChange={(e) =>
                      setInputValues((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                    className="h-4 w-4"
                  />
                )}
                {def.kind === "enum" && (
                  <select
                    value={String(inputValues[key] ?? def.default)}
                    onChange={(e) =>
                      setInputValues((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className={fieldClass}
                  >
                    {def.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
                {def.kind === "source" && (
                  <select
                    value={String(inputValues[key] ?? def.default)}
                    onChange={(e) =>
                      setInputValues((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className={fieldClass}
                  >
                    {(["close", "open", "high", "low", "hlc3", "ohlcv"] as const).map((src) => (
                      <option key={src} value={src}>
                        {src.toUpperCase()}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            ))}
          </div>
        )}

        {hasStyles && (tab === "style" || !hasInputs) && (
          <div className="space-y-3">
            {styleOutputs.map((output) => {
              const defaultColor =
                resolveOutputColor(output.color, theme, null) ?? "#888888";
              const current = styleValues[output.id] ?? {};
              return (
                <div key={output.id} className="flex flex-col gap-2 text-sm">
                  <span className={labelClass}>{output.label}</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1">
                      <span className="text-xs text-[var(--edge-text-muted)]">Color</span>
                      <input
                        type="color"
                        value={current.color ?? defaultColor}
                        onChange={(e) =>
                          setStyleValues((prev) => ({
                            ...prev,
                            [output.id]: { ...prev[output.id], color: e.target.value },
                          }))
                        }
                        className="h-8 w-10 cursor-pointer rounded border border-[var(--edge-border)]"
                      />
                    </label>
                    <label className="flex flex-1 items-center gap-1">
                      <span className="text-xs text-[var(--edge-text-muted)]">Width</span>
                      <input
                        type="number"
                        min={0.5}
                        max={5}
                        step={0.5}
                        value={current.lineWidth ?? output.lineWidth ?? 1.5}
                        onChange={(e) => {
                          const parsed = Number(e.target.value);
                          if (Number.isFinite(parsed)) {
                            setStyleValues((prev) => ({
                              ...prev,
                              [output.id]: { ...prev[output.id], lineWidth: parsed },
                            }));
                          }
                        }}
                        className={`${fieldClass} w-full font-mono`}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </EdgeModalShell>
  );
}
