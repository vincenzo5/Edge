"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { IndicatorConfig, LineStyleOverride } from "@/lib/chartConfig";
import { IndicatorRegistry } from "@edge/chart-core/pluginHost";
import type { InputValue, IndicatorPlugin, ParamDef } from "@edge/chart-core/plugin-api";
import {
  clampInputValue,
  getInputSchema,
  resolveIndicatorInputs,
} from "@edge/chart-core/indicatorInputs";
import { resolveOutputColor } from "@edge/chart-core/indicatorCompute";
import { manifestPlotToSeriesOutput } from "@edge/chart-core";
import { dispatchScriptAlertPrefill } from "@/lib/alerts/openAlertPrefill";
import { useScriptLibraryOptional } from "@/lib/scriptLibrary/ScriptLibraryContext";
import { EdgeButton, EdgeModalShell, EdgeSegmentedTabs, EdgeSelect } from "../design-system";
import { fieldClass as fieldClassHelper } from "../design-system/styles";

type Tab = "inputs" | "style";

type Props = {
  open: boolean;
  indicator: IndicatorConfig | null;
  theme?: "light" | "dark";
  symbol?: string;
  onClose: () => void;
  onSave: (
    id: string,
    patch: { inputs?: Record<string, InputValue>; styles?: Record<string, LineStyleOverride> },
  ) => void;
  onSaveAsTemplate?: () => void;
};

const inputClass = fieldClassHelper({ density: "compact" });

const labelClass = "text-[var(--edge-text-secondary)]";

function clampParamValue(value: InputValue, def: ParamDef): InputValue {
  return clampInputValue(value, def);
}

export default function IndicatorSettingsModal({
  open,
  indicator,
  theme = "dark",
  symbol,
  onClose,
  onSave,
  onSaveAsTemplate,
}: Props) {
  const scriptLibrary = useScriptLibraryOptional();

  const scriptManifest = useMemo(() => {
    if (!indicator?.scriptId || !indicator.revision) return undefined;
    return scriptLibrary?.getRevisionManifest(indicator.scriptId, indicator.revision);
  }, [indicator, scriptLibrary]);

  const scriptPlugin = useMemo((): IndicatorPlugin | undefined => {
    if (!indicator?.scriptId || !indicator.revision) return undefined;
    const manifest = scriptLibrary?.getRevisionManifest(indicator.scriptId, indicator.revision);
    if (!manifest) return undefined;
    return {
      name: indicator.name,
      category: "Other",
      description: manifest.name,
      pane: manifest.pane,
      inputSchema: manifest.inputs,
      outputs: Object.entries(manifest.plots).map(([plotId, plot]) =>
        manifestPlotToSeriesOutput(plotId, plot, plotId),
      ),
    };
  }, [indicator, scriptLibrary]);

  const plugin = useMemo(() => {
    if (!indicator) return undefined;
    if (indicator.kind === "script" || indicator.scriptId) {
      return scriptPlugin;
    }
    return IndicatorRegistry.get(indicator.name);
  }, [indicator, scriptPlugin]);
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
  const scriptAlerts = useMemo(
    () => Object.entries(scriptManifest?.alerts ?? {}),
    [scriptManifest?.alerts],
  );
  const hasScriptAlerts = scriptAlerts.length > 0;

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

  if (!hasInputs && !hasStyles && !hasScriptAlerts) return null;

  return (
    <EdgeModalShell
      open={open}
      title={`${plugin?.description ?? indicator.name} Settings`}
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
                    className={`${inputClass} font-mono`}
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
                  <EdgeSelect
                    variant="field"
                    density="compact"
                    value={String(inputValues[key] ?? def.default)}
                    onChange={(next) => setInputValues((prev) => ({ ...prev, [key]: next }))}
                    options={def.options.map((opt) => ({
                      value: String(opt.value),
                      label: opt.label,
                    }))}
                    className="w-full font-mono"
                  />
                )}
                {def.kind === "source" && (
                  <EdgeSelect
                    variant="field"
                    density="compact"
                    value={String(inputValues[key] ?? def.default)}
                    onChange={(next) => setInputValues((prev) => ({ ...prev, [key]: next }))}
                    options={(["close", "open", "high", "low", "hlc3", "ohlcv"] as const).map(
                      (src) => ({
                        value: src,
                        label: src.toUpperCase(),
                      }),
                    )}
                    className="w-full font-mono"
                  />
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
                        className={`${inputClass} w-full font-mono`}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasScriptAlerts ? (
          <div className="space-y-2 border-t border-[var(--edge-border)] pt-3">
            <p className={labelClass}>Script alert conditions</p>
            {scriptAlerts.map(([conditionId, def]) => (
              <div
                key={conditionId}
                className="flex items-center justify-between gap-2 rounded-[var(--edge-radius-sm)] border border-[var(--edge-border-subtle)] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-[var(--edge-text-primary)]">{def.title}</p>
                  <p className="truncate text-xs text-[var(--edge-text-muted)]">{conditionId}</p>
                </div>
                <EdgeButton
                  variant="secondary"
                  disabled={!symbol || !indicator?.scriptId || !indicator.revision}
                  onClick={() => {
                    if (!symbol || !indicator?.scriptId || !indicator.revision) return;
                    dispatchScriptAlertPrefill({
                      symbol,
                      scriptId: indicator.scriptId,
                      revision: indicator.revision,
                      conditionId,
                      title: def.title,
                    });
                    onClose();
                  }}
                >
                  Create alert…
                </EdgeButton>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </EdgeModalShell>
  );
}
