"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fieldClass } from "../design-system/styles";
import { EdgeButton } from "../design-system";
import { PlaybookTemplateEditor } from "./PlaybookTemplateEditor";
import { formatManageStepPreview } from "@/lib/trading/playbook/display";
import { formatManageNotifySummary } from "@/lib/trading/playbook/manageNotifyAlerts";
import { planPlaybookSteps } from "@/lib/trading/playbook/planSteps";
import {
  PLAYBOOK_PRESET_LIST,
  type PlaybookPresetId,
} from "@/lib/trading/playbook/presets";
import { isUserPlaybookTemplateId } from "@/lib/trading/playbook/resolveTemplate";
import type { PlaybookTemplate, PositionPlan } from "@/lib/trading/playbook/types";

export type ManagePresetSelection = PlaybookPresetId | string | "off";

export type ManagePlaybookPickerProps = {
  value: ManagePresetSelection;
  onChange: (value: ManagePresetSelection) => void;
  positionPlan: PositionPlan | null;
  notifyAtManageLevels?: boolean;
  onNotifyChange?: (enabled: boolean) => void;
  disabled?: boolean;
  testId?: string;
};

type TemplateLibraryResponse = {
  presets: PlaybookTemplate[];
  userTemplates: PlaybookTemplate[];
};

async function fetchPlaybookTemplates(): Promise<TemplateLibraryResponse> {
  const response = await fetch("/api/trading/playbooks/templates");
  if (!response.ok) {
    return { presets: PLAYBOOK_PRESET_LIST, userTemplates: [] };
  }
  return (await response.json()) as TemplateLibraryResponse;
}

export function ManagePlaybookPicker({
  value,
  onChange,
  positionPlan,
  notifyAtManageLevels = false,
  onNotifyChange,
  disabled = false,
  testId = "trade-manage-preset",
}: ManagePlaybookPickerProps) {
  const [presets, setPresets] = useState<PlaybookTemplate[]>(PLAYBOOK_PRESET_LIST);
  const [userTemplates, setUserTemplates] = useState<PlaybookTemplate[]>([]);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);

  const refreshTemplates = useCallback(async () => {
    const data = await fetchPlaybookTemplates();
    setPresets(data.presets);
    setUserTemplates(data.userTemplates);
  }, []);

  useEffect(() => {
    void refreshTemplates();
  }, [refreshTemplates]);

  const allTemplates = useMemo(
    () => [...presets, ...userTemplates],
    [presets, userTemplates],
  );

  const selectedTemplate = useMemo(
    () => (value === "off" ? null : allTemplates.find((item) => item.id === value) ?? null),
    [allTemplates, value],
  );

  const manageEnabled = value !== "off";
  const previewSteps = useMemo(() => {
    if (!positionPlan || !selectedTemplate) return [];
    return planPlaybookSteps(selectedTemplate, positionPlan);
  }, [positionPlan, selectedTemplate]);

  const notifySummary = useMemo(
    () => (previewSteps.length > 0 ? formatManageNotifySummary(previewSteps) : ""),
    [previewSteps],
  );

  const selectedIsUserTemplate =
    value !== "off" && typeof value === "string" && isUserPlaybookTemplateId(value);

  useEffect(() => {
    setRenameDraft(selectedTemplate?.name ?? "");
  }, [selectedTemplate?.id, selectedTemplate?.name]);

  async function runLibraryAction(action: () => Promise<void>) {
    setLibraryBusy(true);
    try {
      await action();
      await refreshTemplates();
    } finally {
      setLibraryBusy(false);
    }
  }

  async function duplicateSelectedTemplate() {
    if (value === "off") return;
    await runLibraryAction(async () => {
      const response = await fetch(`/api/trading/playbooks/templates/${value}/duplicate`, {
        method: "POST",
      });
      if (!response.ok) return;
      const body = (await response.json()) as { template: PlaybookTemplate };
      onChange(body.template.id);
    });
  }

  async function renameSelectedTemplate() {
    if (!selectedIsUserTemplate || !renameDraft.trim()) return;
    await runLibraryAction(async () => {
      await fetch(`/api/trading/playbooks/templates/${value}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameDraft.trim() }),
      });
    });
  }

  async function deleteSelectedTemplate() {
    if (!selectedIsUserTemplate) return;
    await runLibraryAction(async () => {
      const response = await fetch(`/api/trading/playbooks/templates/${value}`, {
        method: "DELETE",
      });
      if (response.ok) {
        onChange("off");
      }
    });
  }

  async function saveEditedTemplate(template: PlaybookTemplate) {
    if (!selectedIsUserTemplate) return;
    await runLibraryAction(async () => {
      const response = await fetch(`/api/trading/playbooks/templates/${value}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          rules: template.rules,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to save template");
      }
    });
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-[var(--edge-text-secondary)]">Manage with…</span>
        <select
          className={`mt-1 ${fieldClass({ density: "standard" })}`}
          value={value}
          onChange={(event) => onChange(event.target.value as ManagePresetSelection)}
          disabled={disabled || libraryBusy}
          data-testid={testId}
        >
          <option value="off">Off</option>
          <optgroup label="Presets">
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </optgroup>
          {userTemplates.length > 0 ? (
            <optgroup label="My templates">
              {userTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </label>

      {manageEnabled ? (
        <div className="flex flex-wrap gap-2" data-testid="trade-manage-library-actions">
          <EdgeButton
            type="button"
            variant="secondary"
            disabled={disabled || libraryBusy}
            onClick={() => void duplicateSelectedTemplate()}
          >
            Duplicate
          </EdgeButton>
          {selectedIsUserTemplate ? (
            <>
              <EdgeButton
                type="button"
                variant="secondary"
                disabled={disabled || libraryBusy}
                onClick={() => setEditorOpen(true)}
                data-testid="trade-manage-edit-template"
              >
                Edit template…
              </EdgeButton>
              <input
                className={`${fieldClass({ density: "compact" })} min-w-[10rem]`}
                value={renameDraft}
                onChange={(event) => setRenameDraft(event.target.value)}
                disabled={disabled || libraryBusy}
                aria-label="Template name"
                data-testid="trade-manage-rename-input"
              />
              <EdgeButton
                type="button"
                variant="secondary"
                disabled={disabled || libraryBusy || !renameDraft.trim()}
                onClick={() => void renameSelectedTemplate()}
              >
                Rename
              </EdgeButton>
              <EdgeButton
                type="button"
                variant="secondary"
                disabled={disabled || libraryBusy}
                onClick={() => void deleteSelectedTemplate()}
              >
                Delete
              </EdgeButton>
            </>
          ) : null}
        </div>
      ) : null}

      {manageEnabled && onNotifyChange ? (
        <div className="space-y-1" data-testid="trade-manage-notify">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={notifyAtManageLevels}
              onChange={(event) => onNotifyChange(event.target.checked)}
              disabled={disabled || libraryBusy}
              data-testid="trade-manage-notify-toggle"
            />
            <span className="text-[var(--edge-text-secondary)]">
              Notify at manage levels
            </span>
          </label>
          {notifyAtManageLevels && notifySummary ? (
            <p className="text-[var(--edge-text-secondary)]">{notifySummary}</p>
          ) : null}
        </div>
      ) : null}

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

      {selectedIsUserTemplate && selectedTemplate ? (
        <PlaybookTemplateEditor
          open={editorOpen}
          template={selectedTemplate}
          positionPlan={positionPlan}
          onClose={() => setEditorOpen(false)}
          onSave={saveEditedTemplate}
          disabled={disabled || libraryBusy}
        />
      ) : null}
    </div>
  );
}
