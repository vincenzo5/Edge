"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EdgeButton,
  EdgeLabeledInput,
  EdgeModalShell,
  EdgeUnderlineTabs,
} from "../design-system";
import { fieldClass } from "../design-system/styles";
import {
  assessTemplateCompleteness,
  TEMPLATE_COMPLETENESS_SLOTS,
} from "@/lib/risk/policy/completeness";
import {
  COMPLETENESS_SLOT_LABELS,
  playbookTemplateToRiskPolicyTemplateFull,
  policyTemplateFailureModeCopy,
} from "@/lib/risk/policy/templateReview";
import type {
  EntryOrder,
  EntrySchedule,
  ExitRuleBinding,
  ExitRuleQtyScope,
  ExitRuleRole,
} from "@/lib/risk/policy/slotSchemas";
import { EntryOrderSchema, OrderExecutionRecipeSchema, defaultEntryOrder } from "@/lib/trading/orderExecutionRecipe";
import { PolicyEntryOrderEditor } from "./PolicyEntryOrderEditor";
import { finalizePlaybookTemplateForSave } from "@/lib/trading/playbookTemplateMutations";
import {
  createPlaybookRuleDraft,
  reorderPlaybookRules,
  resolveTemplateExitsForDraft,
  validateRiskPolicyTemplateDraft,
} from "@/lib/trading/playbook/editorDraft";
import { formatManageStepPreview } from "@/lib/trading/playbook/display";
import { planPlaybookSteps } from "@/lib/trading/playbook/planSteps";
import { isUserPlaybookTemplateId } from "@/lib/trading/playbook/resolveTemplate";
import type {
  PlaybookRule,
  PlaybookTemplate,
  PlaybookThen,
  PlaybookWhen,
  PositionPlan,
} from "@/lib/trading/playbook/types";
import {
  POLICY_EDITOR_FIELD_HELP,
  POLICY_EDITOR_SECTIONS,
  type PolicyEditorSectionId,
} from "./policyEditorCopy";
import {
  PolicyEditorLabeledSelect,
  PolicyEditorLabeledTextarea,
  PolicyEditorSectionHeader,
} from "./policyEditorFields";

export type PlaybookTemplateEditorProps = {
  open: boolean;
  template: PlaybookTemplate;
  positionPlan: PositionPlan | null;
  onClose: () => void;
  onSave: (template: PlaybookTemplate) => Promise<void>;
  disabled?: boolean;
  /** View opens read-only; edit allows save for user templates. Built-ins are always read-only. */
  mode?: "view" | "edit";
};

type EditorSection = PolicyEditorSectionId;

const SECTIONS = POLICY_EDITOR_SECTIONS;

const ROLE_OPTIONS: { value: ExitRuleRole; label: string }[] = [
  { value: "protect", label: "Protect" },
  { value: "takeProfit", label: "Take profit" },
  { value: "manage", label: "Manage" },
  { value: "flatten", label: "Flatten" },
  { value: "hedge", label: "Hedge" },
];

const BINDING_OPTIONS: { value: ExitRuleBinding; label: string }[] = [
  { value: "restingBroker", label: "Resting broker" },
  { value: "managedApp", label: "Managed app" },
  { value: "discretionary", label: "Discretionary" },
  { value: "notifyOnly", label: "Notify only" },
];

const QTY_SCOPE_OPTIONS: { value: ExitRuleQtyScope; label: string }[] = [
  { value: "full", label: "Full" },
  { value: "fraction", label: "Fraction" },
  { value: "remainder", label: "Remainder" },
  { value: "fixedQty", label: "Fixed qty" },
];

const WHEN_KIND_OPTIONS: { value: PlaybookWhen["kind"]; label: string }[] = [
  { value: "multipleOfR", label: "+R multiple" },
  { value: "priceCross", label: "Price cross" },
  { value: "sessionFlatten", label: "Session flatten" },
  { value: "scaleFill", label: "After scale fill" },
  { value: "protectiveFill", label: "Protective fill" },
];

const THEN_KIND_OPTIONS: { value: PlaybookThen["kind"]; label: string }[] = [
  { value: "modifyStop", label: "Modify stop" },
  { value: "reduceQty", label: "Reduce qty" },
  { value: "attachTrail", label: "Attach trail" },
  { value: "flatten", label: "Flatten" },
  { value: "notify", label: "Notify" },
];

function defaultWhen(kind: PlaybookWhen["kind"]): PlaybookWhen {
  switch (kind) {
    case "priceCross":
      return { kind, price: 100, direction: "above" };
    case "multipleOfR":
      return { kind, multiple: 1 };
    case "sessionFlatten":
      return { kind, minutesBeforeClose: 5 };
    case "scaleFill":
      return { kind, ruleId: undefined };
    case "protectiveFill":
      return { kind };
  }
}

function defaultThen(kind: PlaybookThen["kind"]): PlaybookThen {
  switch (kind) {
    case "modifyStop":
      return { kind, breakEven: true };
    case "reduceQty":
      return { kind, fraction: 0.5 };
    case "attachTrail":
      return { kind, stopLeg: { mode: "trail", trailAmount: 1 } };
    case "flatten":
      return { kind };
    case "notify":
      return { kind, message: "Manage level reached" };
  }
}

function SectionNav({
  active,
  onChange,
  disabled,
}: {
  active: EditorSection;
  onChange: (section: EditorSection) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="border-b border-[var(--edge-border-subtle)] px-5 pb-2"
      data-testid="policy-editor-sections"
    >
      <div className="overflow-x-auto">
        <EdgeUnderlineTabs
          layout="content"
          segments={SECTIONS.map((section) => ({
            id: section.id,
            label: section.label,
            disabled,
            testId: `policy-editor-section-${section.id}`,
          }))}
          value={active}
          onChange={(id) => onChange(id as EditorSection)}
          className="min-w-max gap-4"
        />
      </div>
    </div>
  );
}

function RuleEditor({
  rule,
  siblingRules,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  disabled,
}: {
  rule: PlaybookRule;
  siblingRules: PlaybookRule[];
  onChange: (rule: PlaybookRule) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled?: boolean;
}) {
  const requiresOptions = siblingRules.filter((item) => item.id !== rule.id);

  return (
    <div
      className="space-y-2 rounded border border-[var(--edge-border-subtle)] p-2"
      data-testid={`playbook-rule-${rule.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${fieldClass({ density: "compact" })} min-w-[8rem] flex-1`}
          value={rule.label ?? ""}
          onChange={(event) => onChange({ ...rule, label: event.target.value })}
          placeholder="Rule label"
          disabled={disabled}
          aria-label="Rule label"
        />
        <span className="text-[10px] text-[var(--edge-text-secondary)]">{rule.id}</span>
        <EdgeButton type="button" variant="secondary" disabled={disabled || !canMoveUp} onClick={onMoveUp}>
          Up
        </EdgeButton>
        <EdgeButton type="button" variant="secondary" disabled={disabled || !canMoveDown} onClick={onMoveDown}>
          Down
        </EdgeButton>
        <EdgeButton type="button" variant="secondary" disabled={disabled} onClick={onRemove}>
          Remove
        </EdgeButton>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <PolicyEditorLabeledSelect
          label="Role"
          help={POLICY_EDITOR_FIELD_HELP.exitRole}
          density="compact"
          value={rule.role ?? "manage"}
          onChange={(event) =>
            onChange({ ...rule, role: event.target.value as ExitRuleRole })
          }
          disabled={disabled}
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </PolicyEditorLabeledSelect>
        <PolicyEditorLabeledSelect
          label="Binding"
          help={POLICY_EDITOR_FIELD_HELP.exitBinding}
          density="compact"
          value={rule.binding ?? "managedApp"}
          onChange={(event) =>
            onChange({ ...rule, binding: event.target.value as ExitRuleBinding })
          }
          disabled={disabled}
        >
          {BINDING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </PolicyEditorLabeledSelect>
        <label className="block">
          <span className="text-[var(--edge-text-secondary)]">Qty scope</span>
          <select
            className={`mt-1 ${fieldClass({ density: "compact" })}`}
            value={rule.qtyScope ?? ""}
            onChange={(event) =>
              onChange({
                ...rule,
                qtyScope: event.target.value
                  ? (event.target.value as ExitRuleQtyScope)
                  : undefined,
              })
            }
            disabled={disabled}
          >
            <option value="">Default</option>
            {QTY_SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-[var(--edge-text-secondary)]">When</span>
          <select
            className={`mt-1 ${fieldClass({ density: "compact" })}`}
            value={rule.when.kind}
            onChange={(event) =>
              onChange({ ...rule, when: defaultWhen(event.target.value as PlaybookWhen["kind"]) })
            }
            disabled={disabled}
          >
            {WHEN_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[var(--edge-text-secondary)]">Then</span>
          <select
            className={`mt-1 ${fieldClass({ density: "compact" })}`}
            value={rule.then.kind}
            onChange={(event) =>
              onChange({ ...rule, then: defaultThen(event.target.value as PlaybookThen["kind"]) })
            }
            disabled={disabled}
          >
            {THEN_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rule.when.kind === "multipleOfR" ? (
        <label className="block">
          <span className="text-[var(--edge-text-secondary)]">R multiple</span>
          <input
            type="number"
            min={0.1}
            step={0.1}
            className={`mt-1 ${fieldClass({ density: "compact" })}`}
            value={rule.when.multiple}
            onChange={(event) =>
              onChange({
                ...rule,
                when: { kind: "multipleOfR", multiple: Number(event.target.value) },
              })
            }
            disabled={disabled}
          />
        </label>
      ) : null}

      {rule.when.kind === "priceCross" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="text-[var(--edge-text-secondary)]">Price</span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              className={`mt-1 ${fieldClass({ density: "compact" })}`}
              value={rule.when.price}
              onChange={(event) =>
                onChange({
                  ...rule,
                  when: {
                    kind: "priceCross",
                    price: Number(event.target.value),
                    direction:
                      rule.when.kind === "priceCross" ? (rule.when.direction ?? "above") : "above",
                  },
                })
              }
              disabled={disabled}
            />
          </label>
          <label className="block">
            <span className="text-[var(--edge-text-secondary)]">Direction</span>
            <select
              className={`mt-1 ${fieldClass({ density: "compact" })}`}
              value={rule.when.direction ?? "above"}
              onChange={(event) =>
                onChange({
                  ...rule,
                  when: {
                    kind: "priceCross",
                    price: rule.when.kind === "priceCross" ? rule.when.price : 100,
                    direction: event.target.value as "above" | "below",
                  },
                })
              }
              disabled={disabled}
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
          </label>
        </div>
      ) : null}

      {rule.when.kind === "sessionFlatten" ? (
        <label className="block">
          <span className="text-[var(--edge-text-secondary)]">Minutes before close</span>
          <input
            type="number"
            min={1}
            step={1}
            className={`mt-1 ${fieldClass({ density: "compact" })}`}
            value={rule.when.minutesBeforeClose}
            onChange={(event) =>
              onChange({
                ...rule,
                when: {
                  kind: "sessionFlatten",
                  minutesBeforeClose: Number(event.target.value),
                },
              })
            }
            disabled={disabled}
          />
        </label>
      ) : null}

      {rule.when.kind === "scaleFill" ? (
        <label className="block">
          <span className="text-[var(--edge-text-secondary)]">Prior scale rule</span>
          <select
            className={`mt-1 ${fieldClass({ density: "compact" })}`}
            value={rule.when.ruleId ?? ""}
            onChange={(event) =>
              onChange({
                ...rule,
                when: {
                  kind: "scaleFill",
                  ruleId: event.target.value || undefined,
                },
              })
            }
            disabled={disabled}
          >
            <option value="">Any prior scale</option>
            {requiresOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label ?? item.id}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {rule.then.kind === "modifyStop" ? (
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rule.then.breakEven === true}
              onChange={(event) =>
                onChange({
                  ...rule,
                  then: event.target.checked
                    ? { kind: "modifyStop", breakEven: true }
                    : { kind: "modifyStop", stopPrice: 100 },
                })
              }
              disabled={disabled}
            />
            <span className="text-[var(--edge-text-secondary)]">Break-even (stop to entry)</span>
          </label>
          {rule.then.breakEven !== true ? (
            <label className="block">
              <span className="text-[var(--edge-text-secondary)]">Stop price</span>
              <input
                type="number"
                min={0.01}
                step={0.01}
                className={`mt-1 ${fieldClass({ density: "compact" })}`}
                value={rule.then.stopPrice ?? ""}
                onChange={(event) =>
                  onChange({
                    ...rule,
                    then: { kind: "modifyStop", stopPrice: Number(event.target.value) },
                  })
                }
                disabled={disabled}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {rule.then.kind === "reduceQty" ? (
        <label className="block">
          <span className="text-[var(--edge-text-secondary)]">Fraction (0–1)</span>
          <input
            type="number"
            min={0.01}
            max={1}
            step={0.05}
            className={`mt-1 ${fieldClass({ density: "compact" })}`}
            value={rule.then.fraction}
            onChange={(event) =>
              onChange({
                ...rule,
                then: { kind: "reduceQty", fraction: Number(event.target.value) },
              })
            }
            disabled={disabled}
          />
        </label>
      ) : null}

      {rule.then.kind === "attachTrail" ? (
        (() => {
          const trailThen = rule.then;
          return (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[var(--edge-text-secondary)]">Trail amount ($)</span>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  className={`mt-1 ${fieldClass({ density: "compact" })}`}
                  value={trailThen.stopLeg.trailAmount ?? ""}
                  onChange={(event) => {
                    const amount = Number(event.target.value);
                    onChange({
                      ...rule,
                      then: {
                        kind: "attachTrail",
                        stopLeg: {
                          mode: "trail",
                          trailAmount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
                          trailRMultiple: trailThen.stopLeg.trailRMultiple,
                        },
                      },
                    });
                  }}
                  disabled={disabled}
                />
              </label>
              <label className="block">
                <span className="text-[var(--edge-text-secondary)]">Trail (R)</span>
                <input
                  type="number"
                  min={0.01}
                  step={0.1}
                  className={`mt-1 ${fieldClass({ density: "compact" })}`}
                  value={trailThen.stopLeg.trailRMultiple ?? ""}
                  onChange={(event) => {
                    const multiple = Number(event.target.value);
                    onChange({
                      ...rule,
                      then: {
                        kind: "attachTrail",
                        stopLeg: {
                          mode: "trail",
                          trailAmount: trailThen.stopLeg.trailAmount,
                          trailRMultiple:
                            Number.isFinite(multiple) && multiple > 0 ? multiple : undefined,
                        },
                      },
                    });
                  }}
                  disabled={disabled}
                />
              </label>
            </div>
          );
        })()
      ) : null}

      {rule.then.kind === "notify" ? (
        <label className="block">
          <span className="text-[var(--edge-text-secondary)]">Message</span>
          <input
            className={`mt-1 ${fieldClass({ density: "compact" })}`}
            value={rule.then.message ?? ""}
            onChange={(event) =>
              onChange({
                ...rule,
                then: { kind: "notify", message: event.target.value || undefined },
              })
            }
            disabled={disabled}
          />
        </label>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={rule.once}
            onChange={(event) => onChange({ ...rule, once: event.target.checked })}
            disabled={disabled}
          />
          <span className="text-[var(--edge-text-secondary)]">Once</span>
        </label>
        <label className="block">
          <span className="text-[var(--edge-text-secondary)]">Priority</span>
          <input
            type="number"
            step={1}
            className={`mt-1 ${fieldClass({ density: "compact" })} w-20`}
            value={rule.priority ?? ""}
            onChange={(event) =>
              onChange({
                ...rule,
                priority: event.target.value === "" ? undefined : Number(event.target.value),
              })
            }
            disabled={disabled}
          />
        </label>
      </div>

      {requiresOptions.length > 0 ? (
        <fieldset className="space-y-1">
          <legend className="text-[var(--edge-text-secondary)]">Requires</legend>
          {requiresOptions.map((item) => {
            const checked = rule.requires?.includes(item.id) ?? false;
            return (
              <label key={item.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    const current = rule.requires ?? [];
                    const next = event.target.checked
                      ? [...current, item.id]
                      : current.filter((id) => id !== item.id);
                    onChange({
                      ...rule,
                      requires: next.length > 0 ? next : undefined,
                    });
                  }}
                  disabled={disabled}
                />
                <span>{item.label ?? item.id}</span>
              </label>
            );
          })}
        </fieldset>
      ) : null}
    </div>
  );
}

function slotPresenceLabel(presence: "present" | "inherits" | "missing"): string {
  if (presence === "present") return "Present";
  if (presence === "inherits") return "Inherits";
  return "Missing";
}

export function PlaybookTemplateEditor({
  open,
  template,
  positionPlan,
  onClose,
  onSave,
  disabled = false,
  mode = "edit",
}: PlaybookTemplateEditorProps) {
  const readOnly =
    disabled || mode === "view" || !isUserPlaybookTemplateId(template.id);
  const [section, setSection] = useState<EditorSection>("identity");
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [exits, setExits] = useState<PlaybookRule[]>(() =>
    resolveTemplateExitsForDraft(template),
  );
  const [budgetMode, setBudgetMode] = useState<"inherits" | "dollar" | "percentNetLiq">(
    template.budget?.kind === "inherits"
      ? "inherits"
      : template.budget?.kind === "percentNetLiq"
        ? "percentNetLiq"
        : template.budget?.kind === "dollar"
          ? "dollar"
          : "inherits",
  );
  const [budgetValue, setBudgetValue] = useState(
    template.budget && template.budget.kind !== "inherits" ? String(template.budget.value) : "1",
  );
  const [sizingMode, setSizingMode] = useState<"inherits" | "stopDistance">(
    template.sizing && "kind" in template.sizing && template.sizing.kind === "inherits" ? "inherits" : "stopDistance",
  );
  const [maxQty, setMaxQty] = useState(
    template.sizing && "method" in template.sizing && template.sizing.maxQty != null
      ? String(template.sizing.maxQty)
      : "",
  );
  const [stopRMultiple, setStopRMultiple] = useState(
    template.geometry?.stops?.[0]?.rMultiple != null
      ? String(template.geometry.stops[0].rMultiple)
      : "1",
  );
  const [targetRMultiple, setTargetRMultiple] = useState(
    template.geometry?.targets?.[0]?.rMultiple != null
      ? String(template.geometry.targets[0].rMultiple)
      : "",
  );
  const [timeHorizonBars, setTimeHorizonBars] = useState(
    template.geometry?.timeHorizonBars != null
      ? String(template.geometry.timeHorizonBars)
      : "",
  );
  const [minRiskReward, setMinRiskReward] = useState(
    template.gates?.minRiskReward != null ? String(template.gates.minRiskReward) : "",
  );
  const [maxQtyGate, setMaxQtyGate] = useState(
    template.gates?.maxQty != null ? String(template.gates.maxQty) : "",
  );
  const [scheduleKind, setScheduleKind] = useState<EntrySchedule["kind"]>(
    template.defaultEntrySchedule?.kind ?? "immediate",
  );
  const [sessionEvent, setSessionEvent] = useState<"nextRthOpen" | "nextRthClose">(
    template.defaultEntrySchedule?.kind === "sessionEvent"
      ? template.defaultEntrySchedule.event
      : "nextRthOpen",
  );
  const [clockAt, setClockAt] = useState(
    template.defaultEntrySchedule?.kind === "clock" ? template.defaultEntrySchedule.at : "",
  );
  const [clockTimeZone, setClockTimeZone] = useState(
    template.defaultEntrySchedule?.kind === "clock"
      ? template.defaultEntrySchedule.timeZone
      : "America/New_York",
  );
  const [entryOrder, setEntryOrder] = useState<EntryOrder>(
    () => template.defaultEntryOrder ?? defaultEntryOrder(),
  );
  const [issues, setIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSection("identity");
    setName(template.name);
    setDescription(template.description);
    setExits(resolveTemplateExitsForDraft(template));
    setBudgetMode(
      template.budget?.kind === "inherits"
        ? "inherits"
        : template.budget?.kind === "percentNetLiq"
          ? "percentNetLiq"
          : template.budget?.kind === "dollar"
            ? "dollar"
            : "inherits",
    );
    setBudgetValue(
      template.budget && template.budget.kind !== "inherits"
        ? String(template.budget.value)
        : "1",
    );
    setSizingMode(template.sizing && "kind" in template.sizing && template.sizing.kind === "inherits" ? "inherits" : "stopDistance");
    setMaxQty(
      template.sizing && "method" in template.sizing && template.sizing.maxQty != null
        ? String(template.sizing.maxQty)
        : "",
    );
    setStopRMultiple(
      template.geometry?.stops?.[0]?.rMultiple != null
        ? String(template.geometry.stops[0].rMultiple)
        : "1",
    );
    setTargetRMultiple(
      template.geometry?.targets?.[0]?.rMultiple != null
        ? String(template.geometry.targets[0].rMultiple)
        : "",
    );
    setTimeHorizonBars(
      template.geometry?.timeHorizonBars != null
        ? String(template.geometry.timeHorizonBars)
        : "",
    );
    setMinRiskReward(
      template.gates?.minRiskReward != null ? String(template.gates.minRiskReward) : "",
    );
    setMaxQtyGate(template.gates?.maxQty != null ? String(template.gates.maxQty) : "");
    setScheduleKind(template.defaultEntrySchedule?.kind ?? "immediate");
    setSessionEvent(
      template.defaultEntrySchedule?.kind === "sessionEvent"
        ? template.defaultEntrySchedule.event
        : "nextRthOpen",
    );
    setClockAt(
      template.defaultEntrySchedule?.kind === "clock" ? template.defaultEntrySchedule.at : "",
    );
    setClockTimeZone(
      template.defaultEntrySchedule?.kind === "clock"
        ? template.defaultEntrySchedule.timeZone
        : "America/New_York",
    );
    setEntryOrder(template.defaultEntryOrder ?? defaultEntryOrder());
    setIssues([]);
  }, [open, template]);

  const draft = useMemo((): PlaybookTemplate => {
    const budget =
      budgetMode === "inherits"
        ? { kind: "inherits" as const }
        : {
            kind: budgetMode,
            value: Number.parseFloat(budgetValue) || 1,
          };
    const sizing =
      sizingMode === "inherits"
        ? { kind: "inherits" as const }
        : {
            method: "stopDistance" as const,
            ...(maxQty.trim() ? { maxQty: Number.parseFloat(maxQty) } : {}),
          };
    const geometry = {
      stops: [{ rMultiple: Number.parseFloat(stopRMultiple) || 1 }],
      ...(targetRMultiple.trim()
        ? { targets: [{ rMultiple: Number.parseFloat(targetRMultiple) }] }
        : {}),
      ...(timeHorizonBars.trim()
        ? { timeHorizonBars: Number.parseInt(timeHorizonBars, 10) }
        : {}),
    };
    const gates = {
      ...(minRiskReward.trim() ? { minRiskReward: Number.parseFloat(minRiskReward) } : {}),
      ...(maxQtyGate.trim() ? { maxQty: Number.parseFloat(maxQtyGate) } : {}),
    };
    let defaultEntrySchedule: EntrySchedule = { kind: "immediate" };
    if (scheduleKind === "sessionEvent") {
      defaultEntrySchedule = { kind: "sessionEvent", event: sessionEvent };
    } else if (scheduleKind === "clock" && clockAt.trim()) {
      defaultEntrySchedule = {
        kind: "clock",
        at: clockAt.trim(),
        timeZone: clockTimeZone.trim() || "America/New_York",
      };
    }
    const parsedEntryOrder = OrderExecutionRecipeSchema.safeParse(entryOrder);
    return {
      id: template.id,
      name: name.trim(),
      description: description.trim(),
      rules: exits,
      exits,
      schemaVersion: template.schemaVersion ?? 1,
      scope: template.scope ?? "trade",
      budget,
      sizing,
      geometry,
      gates: Object.keys(gates).length > 0 ? gates : undefined,
      defaultEntrySchedule:
        scheduleKind === "immediate" ? undefined : defaultEntrySchedule,
      defaultEntryOrder: parsedEntryOrder.success ? parsedEntryOrder.data : undefined,
    };
  }, [
    template.id,
    template.schemaVersion,
    template.scope,
    name,
    description,
    exits,
    budgetMode,
    budgetValue,
    sizingMode,
    maxQty,
    stopRMultiple,
    targetRMultiple,
    timeHorizonBars,
    minRiskReward,
    maxQtyGate,
    scheduleKind,
    sessionEvent,
    clockAt,
    clockTimeZone,
    entryOrder,
  ]);

  const validation = useMemo(() => validateRiskPolicyTemplateDraft(draft), [draft]);
  const reviewTemplate = useMemo(() => {
    if (!validation.ok) return null;
    return playbookTemplateToRiskPolicyTemplateFull(validation.template);
  }, [validation]);
  const completeness = useMemo(
    () => (reviewTemplate ? assessTemplateCompleteness(reviewTemplate) : null),
    [reviewTemplate],
  );
  const failureModeCopy = useMemo(
    () => (reviewTemplate ? policyTemplateFailureModeCopy(reviewTemplate) : ""),
    [reviewTemplate],
  );

  const previewSteps = useMemo(() => {
    if (!positionPlan || !validation.ok) return [];
    return planPlaybookSteps(validation.template, positionPlan);
  }, [positionPlan, validation]);

  function updateExit(index: number, nextRule: PlaybookRule) {
    setExits((current) => current.map((rule, ruleIndex) => (ruleIndex === index ? nextRule : rule)));
  }

  function removeExit(index: number) {
    setExits((current) => current.filter((_, ruleIndex) => ruleIndex !== index));
  }

  function moveExit(fromIndex: number, toIndex: number) {
    setExits((current) => reorderPlaybookRules(current, fromIndex, toIndex));
  }

  function addExit() {
    setExits((current) => [...current, createPlaybookRuleDraft(current.length + 1)]);
  }

  async function handleSave() {
    if (!validation.ok) {
      setIssues(validation.issues);
      setSection("review");
      return;
    }
    setSaving(true);
    try {
      await onSave(finalizePlaybookTemplateForSave(validation.template));
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <EdgeModalShell
      open={open}
      title={readOnly ? "View risk policy" : "Edit risk policy"}
      subtitle={name.trim() || template.name}
      onClose={onClose}
      maxWidth="md"
      align="center"
      testId="playbook-template-editor"
      footer={
        <div className="flex justify-end gap-2">
          <EdgeButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
            {readOnly ? "Close" : "Cancel"}
          </EdgeButton>
          {!readOnly ? (
            <EdgeButton
              type="button"
              variant="primary"
              onClick={() => void handleSave()}
              disabled={saving || !validation.ok}
              data-testid="playbook-template-editor-save"
            >
              Save policy
            </EdgeButton>
          ) : null}
        </div>
      }
    >
      <SectionNav active={section} onChange={setSection} disabled={saving} />
      <div className="flex flex-col gap-4 px-5 pb-5 pt-3">
        <PolicyEditorSectionHeader sectionId={section} />

        {section === "identity" ? (
          <div className="flex flex-col gap-4" data-testid="policy-editor-identity">
            <EdgeLabeledInput
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={readOnly || saving}
              testId="playbook-template-editor-name"
            />
            <PolicyEditorLabeledTextarea
              label="Description"
              className="min-h-[4rem]"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={readOnly || saving}
              data-testid="playbook-template-editor-description"
            />
          </div>
        ) : null}

        {section === "budget" ? (
          <div className="flex flex-col gap-4" data-testid="policy-editor-budget">
            <PolicyEditorLabeledSelect
              label="Budget source"
              help={POLICY_EDITOR_FIELD_HELP.budgetSource}
              value={budgetMode}
              onChange={(event) =>
                setBudgetMode(event.target.value as typeof budgetMode)
              }
              disabled={readOnly || saving}
            >
              <option value="inherits">Inherit session budget</option>
              <option value="dollar">Fixed dollar risk</option>
              <option value="percentNetLiq">Percent of NetLiq</option>
            </PolicyEditorLabeledSelect>
            {budgetMode !== "inherits" ? (
              <EdgeLabeledInput
                label="Value"
                help={POLICY_EDITOR_FIELD_HELP.budgetValue}
                type="number"
                min={0.01}
                step={budgetMode === "percentNetLiq" ? 0.25 : 1}
                value={budgetValue}
                onChange={(event) => setBudgetValue(event.target.value)}
                disabled={readOnly || saving}
              />
            ) : null}
          </div>
        ) : null}

        {section === "sizing" ? (
          <div className="flex flex-col gap-4" data-testid="policy-editor-sizing">
            <PolicyEditorLabeledSelect
              label="Sizing method"
              help={POLICY_EDITOR_FIELD_HELP.sizingMethod}
              value={sizingMode}
              onChange={(event) =>
                setSizingMode(event.target.value as typeof sizingMode)
              }
              disabled={readOnly || saving}
            >
              <option value="inherits">Inherit session sizing</option>
              <option value="stopDistance">Stop distance</option>
            </PolicyEditorLabeledSelect>
            {sizingMode === "stopDistance" ? (
              <EdgeLabeledInput
                label="Max qty (optional)"
                help={POLICY_EDITOR_FIELD_HELP.maxQty}
                type="number"
                min={1}
                step={1}
                value={maxQty}
                onChange={(event) => setMaxQty(event.target.value)}
                disabled={readOnly || saving}
              />
            ) : null}
          </div>
        ) : null}

        {section === "geometry" ? (
          <div className="flex flex-col gap-4" data-testid="policy-editor-geometry">
            <EdgeLabeledInput
              label="Stop (R multiple)"
              help={POLICY_EDITOR_FIELD_HELP.stopRMultiple}
              type="number"
              min={0.1}
              step={0.1}
              value={stopRMultiple}
              onChange={(event) => setStopRMultiple(event.target.value)}
              disabled={readOnly || saving}
            />
            <EdgeLabeledInput
              label="Target (R multiple, optional)"
              help={POLICY_EDITOR_FIELD_HELP.targetRMultiple}
              type="number"
              min={0.1}
              step={0.1}
              value={targetRMultiple}
              onChange={(event) => setTargetRMultiple(event.target.value)}
              disabled={readOnly || saving}
            />
            <EdgeLabeledInput
              label="Time horizon (bars, optional)"
              help={POLICY_EDITOR_FIELD_HELP.timeHorizonBars}
              type="number"
              min={1}
              step={1}
              value={timeHorizonBars}
              onChange={(event) => setTimeHorizonBars(event.target.value)}
              disabled={readOnly || saving}
            />
          </div>
        ) : null}

        {section === "exits" ? (
          <div className="space-y-2" data-testid="policy-editor-exits">
            <div className="flex items-center justify-between">
              <span className="text-[var(--edge-text-secondary)]">Exit rules</span>
              {!readOnly ? (
                <EdgeButton type="button" variant="secondary" onClick={addExit} disabled={saving}>
                  Add exit
                </EdgeButton>
              ) : null}
            </div>
            {exits.map((rule, index) => (
              <RuleEditor
                key={rule.id}
                rule={rule}
                siblingRules={exits}
                onChange={(nextRule) => updateExit(index, nextRule)}
                onRemove={() => removeExit(index)}
                onMoveUp={() => moveExit(index, index - 1)}
                onMoveDown={() => moveExit(index, index + 1)}
                canMoveUp={index > 0}
                canMoveDown={index < exits.length - 1}
                disabled={readOnly || saving}
              />
            ))}
          </div>
        ) : null}

        {section === "gates" ? (
          <div className="flex flex-col gap-4" data-testid="policy-editor-gates">
            <EdgeLabeledInput
              label="Min risk:reward (optional)"
              help={POLICY_EDITOR_FIELD_HELP.minRiskReward}
              type="number"
              min={0.1}
              step={0.1}
              value={minRiskReward}
              onChange={(event) => setMinRiskReward(event.target.value)}
              disabled={readOnly || saving}
            />
            <EdgeLabeledInput
              label="Max qty (optional)"
              help={POLICY_EDITOR_FIELD_HELP.maxQtyGate}
              type="number"
              min={1}
              step={1}
              value={maxQtyGate}
              onChange={(event) => setMaxQtyGate(event.target.value)}
              disabled={readOnly || saving}
            />
          </div>
        ) : null}

        {section === "entry" ? (
          <PolicyEntryOrderEditor
            value={entryOrder}
            onChange={setEntryOrder}
            protectConfigured={exits.some(
              (rule) => rule.role === "protect" && (rule.binding ?? "managedApp") === "restingBroker",
            )}
            disabled={readOnly || saving}
          />
        ) : null}

        {section === "schedule" ? (
          <div className="flex flex-col gap-4" data-testid="policy-editor-schedule">
            <PolicyEditorLabeledSelect
              label="Default entry schedule"
              help={POLICY_EDITOR_FIELD_HELP.scheduleKind}
              value={scheduleKind}
              onChange={(event) =>
                setScheduleKind(event.target.value as EntrySchedule["kind"])
              }
              disabled={readOnly || saving}
            >
              <option value="immediate">Immediate (none)</option>
              <option value="sessionEvent">Session event</option>
              <option value="clock">Specific time</option>
            </PolicyEditorLabeledSelect>
            {scheduleKind === "sessionEvent" ? (
              <PolicyEditorLabeledSelect
                label="Event"
                value={sessionEvent}
                onChange={(event) =>
                  setSessionEvent(event.target.value as typeof sessionEvent)
                }
                disabled={readOnly || saving}
              >
                <option value="nextRthOpen">Next RTH open</option>
                <option value="nextRthClose">Next RTH close</option>
              </PolicyEditorLabeledSelect>
            ) : null}
            {scheduleKind === "clock" ? (
              <>
                <EdgeLabeledInput
                  label="At (ISO datetime)"
                  value={clockAt}
                  onChange={(event) => setClockAt(event.target.value)}
                  disabled={readOnly || saving}
                  placeholder="2026-07-31T09:35:00.000Z"
                />
                <EdgeLabeledInput
                  label="Time zone (IANA)"
                  value={clockTimeZone}
                  onChange={(event) => setClockTimeZone(event.target.value)}
                  disabled={readOnly || saving}
                />
              </>
            ) : null}
          </div>
        ) : null}

        {section === "review" ? (
          <div className="space-y-3" data-testid="policy-editor-review">
            {completeness ? (
              <>
                <div
                  className="flex flex-wrap gap-2"
                  data-testid="policy-editor-completeness-strip"
                >
                  {TEMPLATE_COMPLETENESS_SLOTS.map((slot) => (
                    <span
                      key={slot}
                      className="rounded border border-[var(--edge-border-subtle)] px-2 py-1 text-[10px] uppercase"
                      data-testid={`policy-completeness-${slot}`}
                    >
                      {COMPLETENESS_SLOT_LABELS[slot]}: {slotPresenceLabel(completeness.slots[slot])}
                    </span>
                  ))}
                </div>
                <p className="text-[var(--edge-text-secondary)]" data-testid="policy-editor-failure-mode">
                  {failureModeCopy}
                </p>
                {completeness.isTradeComplete ? (
                  <p className="text-[var(--edge-text-muted)]">Trade-scoped policy is structurally complete.</p>
                ) : (
                  <p className="text-[var(--edge-text-muted)]">
                    Missing for trade scope: {completeness.missingForTradeScope.join(", ")}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[var(--edge-text-muted)]">Fix validation errors to review completeness.</p>
            )}
          </div>
        ) : null}

        {!validation.ok ? (
          <div
            className="rounded border border-[var(--edge-border-danger)] px-2 py-2 text-[var(--edge-text-danger)]"
            data-testid="playbook-template-editor-errors"
          >
            {validation.issues.map((issue) => (
              <div key={issue}>{issue}</div>
            ))}
          </div>
        ) : issues.length > 0 ? (
          <div data-testid="playbook-template-editor-errors">
            {issues.map((issue) => (
              <div key={issue}>{issue}</div>
            ))}
          </div>
        ) : null}

        {previewSteps.length > 0 ? (
          <div
            className="space-y-1 rounded border border-[var(--edge-border-subtle)] px-2 py-2"
            data-testid="playbook-template-editor-preview"
          >
            <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">
              Planned steps
            </div>
            {previewSteps.map((step) => (
              <div key={step.ruleId}>{formatManageStepPreview(step)}</div>
            ))}
          </div>
        ) : null}
      </div>
    </EdgeModalShell>
  );
}
