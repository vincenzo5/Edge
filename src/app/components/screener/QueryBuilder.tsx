"use client";

import { useCallback, useMemo, useState } from "react";
import type { ParamDef, PriceSource } from "@edge/chart-core";
import { getCatalogByCategory } from "@/lib/indicators";
import type {
  IndicatorTechnicalRule,
  IndicatorRuleTransform,
  TechnicalRule,
} from "@/lib/marketData/schemas/request";
import type {
  QueryRule,
  QueryRuleField,
  RuleGroup,
  RuleGroupChild,
  TechnicalQueryRule,
} from "@/lib/screener/compileQuery";
import {
  QUERY_RULE_FIELDS,
  collectRuleGroupNodeIds,
  createDefaultTechnicalQueryRule,
  formatQueryRuleSummary,
  groupHasTechnicalRule,
  isRuleGroup,
  isTechnicalQueryRule,
  nextQueryNodeId,
} from "@/lib/screener/compileQuery";
import {
  formatTechnicalRuleSummary,
  validateIndicatorRule,
} from "@/lib/screener/validateIndicatorRule";
import { getAllIndicators } from "@edge/chart-core";

type Props = {
  root: RuleGroup;
  onRootChange: (root: RuleGroup) => void;
};

const OPS: IndicatorTechnicalRule["op"][] = [">", ">=", "<", "<=", "=="];
const BARS: IndicatorTechnicalRule["bar"][] = ["last", "first"];
const PRICE_SOURCES: PriceSource[] = ["close", "open", "high", "low", "hlc3", "ohlcv"];

function fieldMeta(field: QueryRuleField) {
  return QUERY_RULE_FIELDS.find((entry) => entry.id === field) ?? QUERY_RULE_FIELDS[0];
}

function updateGroup(
  group: RuleGroup,
  groupId: string,
  updater: (group: RuleGroup) => RuleGroup,
): RuleGroup {
  if (group.id === groupId) return updater(group);
  return {
    ...group,
    children: group.children.map((child) =>
      isRuleGroup(child) ? updateGroup(child, groupId, updater) : child,
    ),
  };
}

function updateRule(
  group: RuleGroup,
  ruleId: string,
  patch: Partial<QueryRule>,
): RuleGroup {
  return {
    ...group,
    children: group.children.map((child) => {
      if (isRuleGroup(child)) return updateRule(child, ruleId, patch);
      if (isTechnicalQueryRule(child)) return child;
      return child.id === ruleId ? { ...child, ...patch } : child;
    }),
  };
}

function updateTechnicalRule(
  group: RuleGroup,
  ruleId: string,
  technical: TechnicalRule,
): RuleGroup {
  return {
    ...group,
    children: group.children.map((child) => {
      if (isRuleGroup(child)) return updateTechnicalRule(child, ruleId, technical);
      if (isTechnicalQueryRule(child) && child.id === ruleId) {
        return { ...child, technical };
      }
      return child;
    }),
  };
}

function removeNode(group: RuleGroup, nodeId: string): RuleGroup {
  return {
    ...group,
    children: group.children
      .filter((child) => child.id !== nodeId)
      .map((child) => (isRuleGroup(child) ? removeNode(child, nodeId) : child)),
  };
}

function resolveDefaultInputs(
  inputSchema: Record<string, ParamDef> | undefined,
  defaultInputs: Record<string, unknown> | undefined,
): Record<string, number | string | boolean> {
  const out: Record<string, number | string | boolean> = {};
  if (inputSchema) {
    for (const [key, def] of Object.entries(inputSchema)) {
      const fromDefault = defaultInputs?.[key];
      if (fromDefault != null && typeof fromDefault !== "object") {
        out[key] = fromDefault as number | string | boolean;
      } else {
        out[key] = def.default;
      }
    }
  }
  return out;
}

function uniqueSeriesKeys(outputs: { key: string; label: string }[] | undefined): { key: string; label: string }[] {
  const seen = new Set<string>();
  const result: { key: string; label: string }[] = [];
  for (const output of outputs ?? []) {
    if (!output.key || seen.has(output.key)) continue;
    seen.add(output.key);
    result.push({ key: output.key, label: output.label || output.key });
  }
  return result;
}

function defaultSeriesForPlugin(pluginName: string): string {
  const plugin = getAllIndicators().find((entry) => entry.name === pluginName);
  const series = uniqueSeriesKeys(plugin?.outputs);
  return series[0]?.key ?? "value";
}

function buildIndicatorRuleFromPlugin(
  indicatorName: string,
  patch?: Partial<IndicatorTechnicalRule>,
): IndicatorTechnicalRule {
  const plugin = getAllIndicators().find((entry) => entry.name === indicatorName);
  return {
    kind: "indicator",
    indicator: indicatorName,
    inputs: resolveDefaultInputs(plugin?.inputSchema, plugin?.defaultInputs),
    series: defaultSeriesForPlugin(indicatorName),
    bar: "last",
    op: "<=",
    threshold: 0,
    ...patch,
  };
}

type CollapseContext = {
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  expandOnly: (id: string) => void;
};

function RuleSummaryRow({
  id,
  summary,
  expanded,
  readOnly,
  onToggle,
  onRemove,
  removeLabel,
}: {
  id: string;
  summary: string;
  expanded: boolean;
  readOnly?: boolean;
  onToggle: () => void;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--edge-surface-panel)]">
      {readOnly ? (
        <span className="w-4 shrink-0 text-[10px] text-[var(--edge-text-muted)]" aria-hidden>
          ▶
        </span>
      ) : (
        <button
          type="button"
          className="edge-focus-ring w-4 shrink-0 text-[10px] text-[var(--edge-text-muted)]"
          onClick={onToggle}
          aria-label={expanded ? "Collapse rule" : "Expand rule"}
          aria-expanded={expanded}
          data-testid={`screener-rule-toggle-${id}`}
        >
          {expanded ? "▼" : "▶"}
        </button>
      )}
      <span className="min-w-0 flex-1 truncate text-xs text-[var(--edge-text-primary)]">{summary}</span>
      <button
        type="button"
        className="edge-focus-ring shrink-0 rounded px-1.5 py-0.5 text-xs text-[var(--edge-negative)] hover:bg-[var(--edge-surface-popover)]"
        onClick={onRemove}
        aria-label={removeLabel}
      >
        ✕
      </button>
    </div>
  );
}

function TechnicalRuleEditor({
  rule,
  collapse,
  onChange,
  onRemove,
}: {
  rule: TechnicalQueryRule;
  collapse: CollapseContext;
  onChange: (technical: TechnicalRule) => void;
  onRemove: () => void;
}) {
  const { technical } = rule;
  const readOnly = technical.kind !== "indicator";
  const expanded = !readOnly && collapse.expandedIds.has(rule.id);
  const summary = formatTechnicalRuleSummary(technical);

  const implementedCatalog = useMemo(() => {
    const grouped = getCatalogByCategory();
    const filtered = Object.fromEntries(
      Object.entries(grouped).map(([category, entries]) => [
        category,
        entries.filter(
          (entry) => entry.implemented && typeof entry.plugin?.compute === "function",
        ),
      ]),
    ) as ReturnType<typeof getCatalogByCategory>;
    return filtered;
  }, []);

  if (readOnly) {
    return (
      <div data-testid={`screener-technical-rule-${rule.id}`}>
        <RuleSummaryRow
          id={rule.id}
          summary={summary}
          expanded={false}
          readOnly
          onToggle={() => {}}
          onRemove={onRemove}
          removeLabel="Remove technical rule"
        />
        <p className="px-2 pb-1.5 text-[10px] text-[var(--edge-text-secondary)]">Preset rule (read-only)</p>
      </div>
    );
  }

  const plugin = getAllIndicators().find((entry) => entry.name === technical.indicator);
  const inputSchema = plugin?.inputSchema ?? {};
  const seriesOptions = uniqueSeriesKeys(plugin?.outputs);
  const validation = validateIndicatorRule(technical, getAllIndicators());

  const patchIndicator = (patch: Partial<IndicatorTechnicalRule>) => {
    onChange({ ...technical, ...patch });
  };

  const patchInput = (key: string, value: number | string | boolean) => {
    patchIndicator({
      inputs: {
        ...(technical.inputs ?? {}),
        [key]: value,
      },
    });
  };

  return (
    <div data-testid={`screener-technical-rule-${rule.id}`}>
      <RuleSummaryRow
        id={rule.id}
        summary={summary}
        expanded={expanded}
        onToggle={() => collapse.toggleExpanded(rule.id)}
        onRemove={onRemove}
        removeLabel="Remove technical rule"
      />
      {expanded ? (
        <div className="space-y-2 border-b border-[var(--edge-border-subtle)] bg-[var(--edge-surface-panel)] px-2 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-[var(--edge-surface-popover)] px-2 py-1 text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
              Technical
            </span>
            <select
              value={technical.indicator}
              onChange={(event) => onChange(buildIndicatorRuleFromPlugin(event.target.value))}
              className="edge-focus-ring rounded border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] px-2 py-1 text-xs"
              data-testid={`screener-technical-indicator-${rule.id}`}
            >
              {Object.entries(implementedCatalog).map(([category, entries]) =>
                entries.length === 0 ? null : (
                  <optgroup key={category} label={category}>
                    {entries.map((entry) => (
                      <option key={entry.name} value={entry.name}>
                        {entry.name}
                      </option>
                    ))}
                  </optgroup>
                ),
              )}
            </select>
          </div>

          {Object.entries(inputSchema).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(inputSchema).map(([key, def]) => (
                <label key={key} className="flex items-center gap-1 text-xs text-[var(--edge-text-secondary)]">
                  <span>{def.label}</span>
                  {def.kind === "number" ? (
                    <input
                      type="number"
                      min={def.min}
                      max={def.max}
                      step={def.step}
                      value={
                        typeof technical.inputs?.[key] === "number"
                          ? technical.inputs[key]
                          : def.default
                      }
                      onChange={(event) => patchInput(key, Number(event.target.value))}
                      className="edge-focus-ring w-20 rounded border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] px-2 py-1 text-xs"
                      data-testid={`screener-technical-input-${key}-${rule.id}`}
                    />
                  ) : null}
                  {def.kind === "boolean" ? (
                    <input
                      type="checkbox"
                      checked={technical.inputs?.[key] === true}
                      onChange={(event) => patchInput(key, event.target.checked)}
                      className="edge-focus-ring"
                    />
                  ) : null}
                  {def.kind === "enum" ? (
                    <select
                      value={
                        typeof technical.inputs?.[key] === "string"
                          ? technical.inputs[key]
                          : def.default
                      }
                      onChange={(event) => patchInput(key, event.target.value)}
                      className="edge-focus-ring rounded border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] px-2 py-1 text-xs"
                    >
                      {def.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {def.kind === "source" ? (
                    <select
                      value={
                        typeof technical.inputs?.[key] === "string"
                          ? technical.inputs[key]
                          : def.default
                      }
                      onChange={(event) => patchInput(key, event.target.value)}
                      className="edge-focus-ring rounded border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] px-2 py-1 text-xs"
                    >
                      {PRICE_SOURCES.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </label>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={technical.series}
              onChange={(event) => patchIndicator({ series: event.target.value })}
              className="edge-focus-ring rounded border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] px-2 py-1 text-xs"
              data-testid={`screener-technical-series-${rule.id}`}
            >
              {seriesOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={technical.bar}
              onChange={(event) =>
                patchIndicator({ bar: event.target.value as IndicatorTechnicalRule["bar"] })
              }
              className="edge-focus-ring rounded border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] px-2 py-1 text-xs"
            >
              {BARS.map((bar) => (
                <option key={bar} value={bar}>
                  {bar}
                </option>
              ))}
            </select>
            <select
              value={technical.op}
              onChange={(event) =>
                patchIndicator({ op: event.target.value as IndicatorTechnicalRule["op"] })
              }
              className="edge-focus-ring rounded border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] px-2 py-1 text-xs"
              data-testid={`screener-technical-op-${rule.id}`}
            >
              {OPS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={technical.threshold}
              onChange={(event) => patchIndicator({ threshold: Number(event.target.value) })}
              className="edge-focus-ring w-24 rounded border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] px-2 py-1 text-xs"
              data-testid={`screener-technical-threshold-${rule.id}`}
            />
            {technical.indicator === "BOLL" ? (
              <label className="flex items-center gap-1 text-xs text-[var(--edge-text-secondary)]">
                <input
                  type="checkbox"
                  checked={technical.transform?.kind === "bollPctB"}
                  onChange={(event) =>
                    patchIndicator({
                      transform: event.target.checked
                        ? ({ kind: "bollPctB" } satisfies IndicatorRuleTransform)
                        : undefined,
                    })
                  }
                  className="edge-focus-ring"
                />
                %B transform
              </label>
            ) : null}
          </div>

          {!validation.ok ? (
            <p className="text-[11px] text-[var(--edge-negative)]" data-testid="screener-technical-validation">
              {validation.errors[0]}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RuleEditor({
  rule,
  collapse,
  onChange,
  onRemove,
}: {
  rule: QueryRule;
  collapse: CollapseContext;
  onChange: (patch: Partial<QueryRule>) => void;
  onRemove: () => void;
}) {
  const meta = fieldMeta(rule.field);
  const expanded = collapse.expandedIds.has(rule.id);
  const summary = formatQueryRuleSummary(rule);

  return (
    <div data-testid={`screener-rule-${rule.id}`}>
      <RuleSummaryRow
        id={rule.id}
        summary={summary}
        expanded={expanded}
        onToggle={() => collapse.toggleExpanded(rule.id)}
        onRemove={onRemove}
        removeLabel="Remove rule"
      />
      {expanded ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--edge-border-subtle)] bg-[var(--edge-surface-panel)] px-2 py-2">
          <select
            value={rule.field}
            onChange={(event) =>
              onChange({
                field: event.target.value as QueryRuleField,
                value: undefined,
                min: undefined,
                max: undefined,
              })
            }
            className="edge-focus-ring rounded border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] px-2 py-1 text-xs"
          >
            {QUERY_RULE_FIELDS.map((field) => (
              <option key={field.id} value={field.id}>
                {field.label}
              </option>
            ))}
          </select>

          {meta.kind === "text" ? (
            <input
              type="text"
              value={typeof rule.value === "string" ? rule.value : ""}
              onChange={(event) => onChange({ value: event.target.value })}
              placeholder={meta.label}
              className="edge-focus-ring min-w-[140px] flex-1 rounded border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] px-2 py-1 text-xs"
            />
          ) : null}

          {meta.kind === "boolean" ? (
            <select
              value={rule.value === true ? "true" : rule.value === false ? "false" : ""}
              onChange={(event) => onChange({ value: event.target.value === "true" })}
              className="edge-focus-ring rounded border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] px-2 py-1 text-xs"
            >
              <option value="">Select…</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : null}

          {meta.kind === "range" ? (
            <>
              <input
                type="number"
                value={rule.min ?? ""}
                onChange={(event) =>
                  onChange({
                    min: event.target.value === "" ? undefined : Number(event.target.value),
                  })
                }
                placeholder="Min"
                className="edge-focus-ring w-24 rounded border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] px-2 py-1 text-xs"
              />
              <input
                type="number"
                value={rule.max ?? ""}
                onChange={(event) =>
                  onChange({
                    max: event.target.value === "" ? undefined : Number(event.target.value),
                  })
                }
                placeholder="Max"
                className="edge-focus-ring w-24 rounded border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] px-2 py-1 text-xs"
              />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function GroupEditor({
  group,
  depth,
  root,
  collapse,
  onChange,
}: {
  group: RuleGroup;
  depth: number;
  root: RuleGroup;
  collapse: CollapseContext;
  onChange: (next: RuleGroup) => void;
}) {
  const expanded = collapse.expandedIds.has(group.id);

  return (
    <div
      className={depth > 0 ? "ml-3 border-l border-[var(--edge-border-subtle)] pl-2" : ""}
      data-testid={`screener-group-${group.id}`}
    >
      {depth > 0 ? (
        <div className="flex items-center gap-2 px-2 py-1.5">
          <button
            type="button"
            className="edge-focus-ring w-4 shrink-0 text-[10px] text-[var(--edge-text-muted)]"
            onClick={() => collapse.toggleExpanded(group.id)}
            aria-label={expanded ? "Collapse group" : "Expand group"}
            data-testid={`screener-rule-toggle-${group.id}`}
          >
            {expanded ? "▼" : "▶"}
          </button>
          <span className="text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">OR group</span>
          <select
            value={group.combinator}
            onChange={(event) =>
              onChange({
                ...group,
                combinator: event.target.value as "and" | "or",
              })
            }
            className="edge-focus-ring rounded border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] px-2 py-1 text-xs"
            data-testid={`screener-group-combinator-${group.id}`}
          >
            <option value="and">AND</option>
            <option value="or">OR</option>
          </select>
          <button
            type="button"
            className="edge-focus-ring ml-auto rounded px-2 py-0.5 text-xs text-[var(--edge-negative)]"
            onClick={() => onChange({ ...group, children: [] })}
            aria-label="Clear group"
          >
            Clear
          </button>
        </div>
      ) : null}

      {depth === 0 || expanded ? (
        <div>
          {group.children.map((child) =>
            isRuleGroup(child) ? (
              <GroupEditor
                key={child.id}
                group={child}
                depth={depth + 1}
                root={root}
                collapse={collapse}
                onChange={(next) =>
                  onChange({
                    ...group,
                    children: group.children.map((entry) =>
                      isRuleGroup(entry) && entry.id === child.id ? next : entry,
                    ),
                  })
                }
              />
            ) : isTechnicalQueryRule(child) ? (
              <TechnicalRuleEditor
                key={child.id}
                rule={child}
                collapse={collapse}
                onChange={(technical) =>
                  onChange(updateTechnicalRule(group, child.id, technical))
                }
                onRemove={() => onChange(removeNode(group, child.id))}
              />
            ) : (
              <RuleEditor
                key={child.id}
                rule={child}
                collapse={collapse}
                onChange={(patch) => onChange(updateRule(group, child.id, patch))}
                onRemove={() => onChange(removeNode(group, child.id))}
              />
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function QueryBuilder({ root, onRootChange }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const hasTechnical = groupHasTechnicalRule(root);
  const allNodeIds = useMemo(() => collectRuleGroupNodeIds(root), [root]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandOnly = useCallback((id: string) => {
    setExpandedIds(new Set([id]));
  }, []);

  const collapse: CollapseContext = useMemo(
    () => ({
      expandedIds,
      toggleExpanded,
      expandOnly,
    }),
    [expandedIds, toggleExpanded, expandOnly],
  );

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(allNodeIds));
  }, [allNodeIds]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const addWithExpand = useCallback(
    (nextRoot: RuleGroup, newId: string) => {
      onRootChange(nextRoot);
      expandOnly(newId);
    },
    [onRootChange, expandOnly],
  );

  const addRule = () => {
    const newId = nextQueryNodeId("rule");
    addWithExpand(
      {
        ...root,
        children: [...root.children, { id: newId, field: "sector", value: "" }],
      },
      newId,
    );
  };

  const addTechnicalRule = () => {
    if (hasTechnical) return;
    const newRule = createDefaultTechnicalQueryRule();
    addWithExpand(
      {
        ...root,
        children: [...root.children, newRule],
      },
      newRule.id,
    );
  };

  const addGroup = () => {
    const groupId = nextQueryNodeId("group");
    const ruleId = nextQueryNodeId("rule");
    addWithExpand(
      {
        ...root,
        children: [
          ...root.children,
          {
            id: groupId,
            combinator: "or",
            children: [{ id: ruleId, field: "sector", value: "" }],
          },
        ],
      },
      ruleId,
    );
  };

  return (
    <div className="space-y-2" data-testid="screener-query-builder">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">Rules</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="edge-focus-ring text-[10px] text-[var(--edge-accent-blue)] hover:underline"
            onClick={expandAll}
            data-testid="screener-expand-all"
          >
            Expand all
          </button>
          <button
            type="button"
            className="edge-focus-ring text-[10px] text-[var(--edge-accent-blue)] hover:underline"
            onClick={collapseAll}
            data-testid="screener-collapse-all"
          >
            Collapse all
          </button>
        </div>
      </div>

      {root.children.length === 0 ? (
        <p className="text-xs text-[var(--edge-text-secondary)]">
          No custom rules yet. Add a rule or pick a preset.
        </p>
      ) : (
        <div
          className="max-h-[40vh] overflow-y-auto rounded border border-[var(--edge-border-subtle)]"
          data-testid="screener-rules-scroll"
        >
          <GroupEditor group={root} depth={0} root={root} collapse={collapse} onChange={onRootChange} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="edge-focus-ring rounded px-2 py-1 text-xs text-[var(--edge-accent-blue)] hover:bg-[var(--edge-surface-panel)]"
          onClick={addRule}
          data-testid="screener-add-rule"
        >
          Add rule
        </button>
        <button
          type="button"
          className="edge-focus-ring rounded px-2 py-1 text-xs text-[var(--edge-accent-blue)] hover:bg-[var(--edge-surface-panel)] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={addTechnicalRule}
          disabled={hasTechnical}
          data-testid="screener-add-technical-rule"
        >
          Add technical rule
        </button>
        <button
          type="button"
          className="edge-focus-ring rounded px-2 py-1 text-xs text-[var(--edge-accent-blue)] hover:bg-[var(--edge-surface-panel)]"
          onClick={addGroup}
          data-testid="screener-add-group"
        >
          Add OR group
        </button>
      </div>
    </div>
  );
}

export type { RuleGroupChild };
