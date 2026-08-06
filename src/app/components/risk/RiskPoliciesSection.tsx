"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CopyIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "../chart-chrome/ChartHeaderIcons";
import { EyeIcon } from "../chart-icons/ChartToolIcons";
import { EdgeIconButton, EdgeSelect } from "../design-system";
import { PlaybookTemplateEditor } from "../trading/PlaybookTemplateEditor";
import { templateToPatchPayload } from "@/lib/trading/playbookTemplateMutations";
import type { PlaybookPresetId } from "@/lib/trading/playbook/presets";
import { isUserPlaybookTemplateId } from "@/lib/trading/playbook/resolveTemplate";
import type { PlaybookTemplate } from "@/lib/trading/playbook/types";
import { assessTemplateCompleteness } from "@/lib/risk/policy/completeness";
import { playbookTemplateToRiskPolicyTemplateFull } from "@/lib/risk/policy/templateReview";
import {
  readDefaultPolicyBySide,
  recordDefaultPolicyForSide,
} from "@/lib/risk/policy/defaultPolicyPreference";
import {
  mergePlaybookTemplateLibrary,
  normalizePlaybookTemplates,
  setCachedPlaybookTemplates,
} from "@/lib/trading/playbookTemplateCache";

type TemplateLibraryResponse = {
  presets?: PlaybookTemplate[] | null;
  userTemplates?: PlaybookTemplate[] | null;
};

type EditorMode = "view" | "edit";

const ACTION_ICON_SIZE = 14;

async function fetchUserPlaybookTemplates(): Promise<PlaybookTemplate[]> {
  const response = await fetch("/api/trading/playbooks/templates");
  if (!response.ok) {
    return [];
  }
  const body = (await response.json()) as TemplateLibraryResponse;
  setCachedPlaybookTemplates(mergePlaybookTemplateLibrary(body));
  return normalizePlaybookTemplates(body.userTemplates);
}

function completenessSummary(template: PlaybookTemplate): string {
  const report = assessTemplateCompleteness(playbookTemplateToRiskPolicyTemplateFull(template));
  if (report.isTradeComplete) return "Complete";
  if (report.slots.exits === "present") return "Manage-only";
  return "Incomplete";
}

export function RiskPoliciesSection() {
  const [userTemplates, setUserTemplates] = useState<PlaybookTemplate[]>([]);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("view");
  const [selectedTemplate, setSelectedTemplate] = useState<PlaybookTemplate | null>(null);
  const [defaultLongPolicyId, setDefaultLongPolicyId] = useState<string>("");
  const [defaultShortPolicyId, setDefaultShortPolicyId] = useState<string>("");

  const refreshTemplates = useCallback(async () => {
    setUserTemplates(await fetchUserPlaybookTemplates());
  }, []);

  useEffect(() => {
    void refreshTemplates();
  }, [refreshTemplates]);

  useEffect(() => {
    const prefs = readDefaultPolicyBySide();
    setDefaultLongPolicyId(prefs.long ?? "");
    setDefaultShortPolicyId(prefs.short ?? "");
  }, []);

  async function runLibraryAction(action: () => Promise<void>) {
    setLibraryBusy(true);
    try {
      await action();
      await refreshTemplates();
    } finally {
      setLibraryBusy(false);
    }
  }

  function openTemplate(template: PlaybookTemplate, mode: EditorMode) {
    setSelectedTemplate(template);
    setEditorMode(mode);
    setEditorOpen(true);
  }

  async function duplicateTemplate(id: string) {
    await runLibraryAction(async () => {
      const response = await fetch(`/api/trading/playbooks/templates/${id}/duplicate`, {
        method: "POST",
      });
      if (!response.ok) return;
      const body = (await response.json()) as { template: PlaybookTemplate };
      openTemplate(body.template, "edit");
    });
  }

  async function createFromPreset(sourceTemplateId: PlaybookPresetId = "break_even") {
    await runLibraryAction(async () => {
      const response = await fetch("/api/trading/playbooks/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceTemplateId }),
      });
      if (!response.ok) return;
      const body = (await response.json()) as { template: PlaybookTemplate };
      openTemplate(body.template, "edit");
    });
  }

  async function deleteTemplate(id: string) {
    await runLibraryAction(async () => {
      await fetch(`/api/trading/playbooks/templates/${id}`, { method: "DELETE" });
      if (selectedTemplate?.id === id) {
        setEditorOpen(false);
        setSelectedTemplate(null);
      }
      if (defaultLongPolicyId === id) {
        setDefaultLongPolicyId("");
        recordDefaultPolicyForSide("BUY", null);
      }
      if (defaultShortPolicyId === id) {
        setDefaultShortPolicyId("");
        recordDefaultPolicyForSide("SELL", null);
      }
    });
  }

  async function saveEditedTemplate(template: PlaybookTemplate) {
    if (!isUserPlaybookTemplateId(template.id)) return;
    await runLibraryAction(async () => {
      const response = await fetch(`/api/trading/playbooks/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateToPatchPayload(template)),
      });
      if (!response.ok) {
        throw new Error("Failed to save policy");
      }
      const body = (await response.json()) as { template: PlaybookTemplate };
      setSelectedTemplate(body.template);
    });
  }

  const defaultPolicyOptions = userTemplates.map((template) => ({
    value: template.id,
    label: template.name,
  }));

  function renderRow(template: PlaybookTemplate) {
    const name = template.name;

    return (
      <div
        key={template.id}
        className="flex items-center justify-between gap-2 border-b border-[var(--edge-border-subtle)] py-2 last:border-b-0"
        data-testid={`risk-policy-row-${template.id}`}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-[var(--edge-text-primary)]">{name}</div>
          <div className="text-[10px] text-[var(--edge-text-muted)]">
            {completenessSummary(template)}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <EdgeIconButton
            type="button"
            title="View"
            aria-label={`View ${name}`}
            disabled={libraryBusy}
            onClick={() => openTemplate(template, "view")}
            data-testid={`risk-policy-view-${template.id}`}
          >
            <EyeIcon size={ACTION_ICON_SIZE} aria-hidden />
          </EdgeIconButton>
          <EdgeIconButton
            type="button"
            title="Edit"
            aria-label={`Edit ${name}`}
            disabled={libraryBusy}
            onClick={() => openTemplate(template, "edit")}
            data-testid={`risk-policy-edit-${template.id}`}
          >
            <PencilIcon size={ACTION_ICON_SIZE} />
          </EdgeIconButton>
          <EdgeIconButton
            type="button"
            title="Duplicate"
            aria-label={`Duplicate ${name}`}
            disabled={libraryBusy}
            onClick={() => void duplicateTemplate(template.id)}
            data-testid={`risk-policy-duplicate-${template.id}`}
          >
            <CopyIcon size={ACTION_ICON_SIZE} />
          </EdgeIconButton>
          <EdgeIconButton
            type="button"
            title="Delete"
            aria-label={`Delete ${name}`}
            disabled={libraryBusy}
            className="hover:text-[var(--edge-negative)]"
            onClick={() => void deleteTemplate(template.id)}
            data-testid={`risk-policy-delete-${template.id}`}
          >
            <TrashIcon size={ACTION_ICON_SIZE} />
          </EdgeIconButton>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-2" data-testid="risk-policies-section">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--edge-text-muted)]">
          Policies
        </h3>
        <EdgeIconButton
          type="button"
          title="New policy"
          aria-label="New policy"
          disabled={libraryBusy}
          onClick={() => void createFromPreset()}
          data-testid="risk-policy-create"
        >
          <PlusIcon size={ACTION_ICON_SIZE} />
        </EdgeIconButton>
      </div>
      <p className="text-[10px] text-[var(--edge-text-muted)]">
        Reusable Protect + Manage recipes. Apply from the Trade panel. Default below seeds new
        long/short box shape and the Trade panel policy when unbound.
      </p>
      <div
        className="grid gap-3 rounded border border-[var(--edge-border-subtle)] p-2"
        data-testid="risk-policy-defaults"
      >
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--edge-text-muted)]">
          Default policy
        </div>
        <EdgeSelect
          label="Long"
          value={defaultLongPolicyId}
          onChange={(value) => {
            setDefaultLongPolicyId(value);
            recordDefaultPolicyForSide("BUY", value || null);
          }}
          placeholder="2R (no default policy)"
          options={[{ value: "", label: "2R (no default policy)" }, ...defaultPolicyOptions]}
          disabled={libraryBusy}
          testId="risk-policy-default-long"
        />
        <EdgeSelect
          label="Short"
          value={defaultShortPolicyId}
          onChange={(value) => {
            setDefaultShortPolicyId(value);
            recordDefaultPolicyForSide("SELL", value || null);
          }}
          placeholder="2R (no default policy)"
          options={[{ value: "", label: "2R (no default policy)" }, ...defaultPolicyOptions]}
          disabled={libraryBusy}
          testId="risk-policy-default-short"
        />
      </div>
      {userTemplates.length > 0 ? (
        <div className="rounded border border-[var(--edge-border-subtle)] px-2">
          {userTemplates.map((template) => renderRow(template))}
        </div>
      ) : (
        <p className="text-[10px] text-[var(--edge-text-muted)]">No policies yet.</p>
      )}
      {selectedTemplate ? (
        <PlaybookTemplateEditor
          open={editorOpen}
          template={selectedTemplate}
          positionPlan={null}
          mode={editorMode}
          onClose={() => setEditorOpen(false)}
          onSave={saveEditedTemplate}
          disabled={libraryBusy}
        />
      ) : null}
    </section>
  );
}
