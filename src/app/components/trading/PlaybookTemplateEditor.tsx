"use client";

import { useEffect, useMemo, useState } from "react";
import { EdgeButton, EdgeModalShell } from "../design-system";
import { fieldClass } from "../design-system/styles";
import {
  createPlaybookRuleDraft,
  reorderPlaybookRules,
  validatePlaybookTemplateDraft,
} from "@/lib/trading/playbook/editorDraft";
import { formatManageStepPreview } from "@/lib/trading/playbook/display";
import { planPlaybookSteps } from "@/lib/trading/playbook/planSteps";
import type {
  PlaybookRule,
  PlaybookTemplate,
  PlaybookThen,
  PlaybookWhen,
  PositionPlan,
} from "@/lib/trading/playbook/types";

export type PlaybookTemplateEditorProps = {
  open: boolean;
  template: PlaybookTemplate;
  positionPlan: PositionPlan | null;
  onClose: () => void;
  onSave: (template: PlaybookTemplate) => Promise<void>;
  disabled?: boolean;
};

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
        <label className="block">
          <span className="text-[var(--edge-text-secondary)]">Trail amount ($)</span>
          <input
            type="number"
            min={0.01}
            step={0.01}
            className={`mt-1 ${fieldClass({ density: "compact" })}`}
            value={rule.then.stopLeg.trailAmount ?? ""}
            onChange={(event) =>
              onChange({
                ...rule,
                then: {
                  kind: "attachTrail",
                  stopLeg: { mode: "trail", trailAmount: Number(event.target.value) },
                },
              })
            }
            disabled={disabled}
          />
        </label>
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

export function PlaybookTemplateEditor({
  open,
  template,
  positionPlan,
  onClose,
  onSave,
  disabled = false,
}: PlaybookTemplateEditorProps) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [rules, setRules] = useState<PlaybookRule[]>(template.rules);
  const [issues, setIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(template.name);
    setDescription(template.description);
    setRules(template.rules);
    setIssues([]);
  }, [open, template]);

  const draft = useMemo(
    () => ({
      id: template.id,
      name: name.trim(),
      description: description.trim(),
      rules,
    }),
    [template.id, name, description, rules],
  );

  const validation = useMemo(() => validatePlaybookTemplateDraft(draft), [draft]);

  const previewSteps = useMemo(() => {
    if (!positionPlan || !validation.ok) return [];
    return planPlaybookSteps(validation.template, positionPlan);
  }, [positionPlan, validation]);

  function updateRule(index: number, nextRule: PlaybookRule) {
    setRules((current) => current.map((rule, ruleIndex) => (ruleIndex === index ? nextRule : rule)));
  }

  function removeRule(index: number) {
    setRules((current) => current.filter((_, ruleIndex) => ruleIndex !== index));
  }

  function moveRule(fromIndex: number, toIndex: number) {
    setRules((current) => reorderPlaybookRules(current, fromIndex, toIndex));
  }

  function addRule() {
    setRules((current) => [...current, createPlaybookRuleDraft(current.length + 1)]);
  }

  async function handleSave() {
    if (!validation.ok) {
      setIssues(validation.issues);
      return;
    }
    setSaving(true);
    try {
      await onSave(validation.template);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <EdgeModalShell
      open={open}
      title="Edit manage template"
      onClose={onClose}
      maxWidth="md"
      align="center"
      testId="playbook-template-editor"
      footer={
        <div className="flex justify-end gap-2">
          <EdgeButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </EdgeButton>
          <EdgeButton
            type="button"
            variant="primary"
            onClick={() => void handleSave()}
            disabled={disabled || saving || !validation.ok}
            data-testid="playbook-template-editor-save"
          >
            Save template
          </EdgeButton>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="text-[var(--edge-text-secondary)]">Name</span>
          <input
            className={`mt-1 ${fieldClass({ density: "standard" })}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={disabled || saving}
            data-testid="playbook-template-editor-name"
          />
        </label>

        <label className="block">
          <span className="text-[var(--edge-text-secondary)]">Description</span>
          <textarea
            className={`mt-1 ${fieldClass({ density: "standard" })} min-h-[4rem]`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={disabled || saving}
            data-testid="playbook-template-editor-description"
          />
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[var(--edge-text-secondary)]">Rules</span>
            <EdgeButton type="button" variant="secondary" onClick={addRule} disabled={disabled || saving}>
              Add rule
            </EdgeButton>
          </div>
          {rules.map((rule, index) => (
            <RuleEditor
              key={rule.id}
              rule={rule}
              siblingRules={rules}
              onChange={(nextRule) => updateRule(index, nextRule)}
              onRemove={() => removeRule(index)}
              onMoveUp={() => moveRule(index, index - 1)}
              onMoveDown={() => moveRule(index, index + 1)}
              canMoveUp={index > 0}
              canMoveDown={index < rules.length - 1}
              disabled={disabled || saving}
            />
          ))}
        </div>

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
