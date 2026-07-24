"use client";

import { useMemo } from "react";
import { fieldClass } from "../design-system/styles";
import { formatManageStepPreview } from "@/lib/trading/playbook/display";
import { planPlaybookSteps } from "@/lib/trading/playbook/planSteps";
import {
  PLAYBOOK_PRESET_LIST,
  type PlaybookPresetId,
} from "@/lib/trading/playbook/presets";
import type { PositionPlan } from "@/lib/trading/playbook/types";

export type ManagePresetSelection = PlaybookPresetId | "off";

export type ManagePlaybookPickerProps = {
  value: ManagePresetSelection;
  onChange: (value: ManagePresetSelection) => void;
  positionPlan: PositionPlan | null;
  disabled?: boolean;
  testId?: string;
};

export function ManagePlaybookPicker({
  value,
  onChange,
  positionPlan,
  disabled = false,
  testId = "trade-manage-preset",
}: ManagePlaybookPickerProps) {
  const manageEnabled = value !== "off";
  const previewSteps = useMemo(() => {
    if (!positionPlan || value === "off") return [];
    const template = PLAYBOOK_PRESET_LIST.find((item) => item.id === value);
    if (!template) return [];
    return planPlaybookSteps(template, positionPlan);
  }, [positionPlan, value]);

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-[var(--edge-text-secondary)]">Manage with…</span>
        <select
          className={`mt-1 ${fieldClass({ density: "standard" })}`}
          value={value}
          onChange={(event) => onChange(event.target.value as ManagePresetSelection)}
          disabled={disabled}
          data-testid={testId}
        >
          <option value="off">Off</option>
          {PLAYBOOK_PRESET_LIST.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </label>
      {manageEnabled && previewSteps.length > 0 ? (
        <div
          className="space-y-1 rounded border border-[var(--edge-border-subtle)] px-2 py-2"
          data-testid="trade-manage-preview"
        >
          <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">
            Management steps
          </div>
          {previewSteps.map((step) => (
            <div key={step.ruleId}>{formatManageStepPreview(step)}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
