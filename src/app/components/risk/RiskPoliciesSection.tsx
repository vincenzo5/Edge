"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EdgeButton } from "../design-system";
import { PlaybookTemplateEditor } from "../trading/PlaybookTemplateEditor";
import { templateToPatchPayload } from "@/lib/trading/playbookTemplateMutations";
import {
  PLAYBOOK_PRESET_LIST,
  type PlaybookPresetId,
} from "@/lib/trading/playbook/presets";
import { isUserPlaybookTemplateId } from "@/lib/trading/playbook/resolveTemplate";
import type { PlaybookTemplate } from "@/lib/trading/playbook/types";
import { assessTemplateCompleteness } from "@/lib/risk/policy/completeness";
import { playbookTemplateToRiskPolicyTemplateFull } from "@/lib/risk/policy/templateReview";

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

function completenessSummary(template: PlaybookTemplate): string {
  const report = assessTemplateCompleteness(playbookTemplateToRiskPolicyTemplateFull(template));
  if (report.isTradeComplete) return "Complete";
  if (report.slots.exits === "present") return "Manage-only";
  return "Incomplete";
}

export function RiskPoliciesSection() {
  const [presets, setPresets] = useState<PlaybookTemplate[]>(PLAYBOOK_PRESET_LIST);
  const [userTemplates, setUserTemplates] = useState<PlaybookTemplate[]>([]);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PlaybookTemplate | null>(null);

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

  async function runLibraryAction(action: () => Promise<void>) {
    setLibraryBusy(true);
    try {
      await action();
      await refreshTemplates();
    } finally {
      setLibraryBusy(false);
    }
  }

  function openTemplate(template: PlaybookTemplate) {
    setSelectedTemplate(template);
    setEditorOpen(true);
  }

  async function duplicateTemplate(id: string) {
    await runLibraryAction(async () => {
      const response = await fetch(`/api/trading/playbooks/templates/${id}/duplicate`, {
        method: "POST",
      });
      if (!response.ok) return;
      const body = (await response.json()) as { template: PlaybookTemplate };
      openTemplate(body.template);
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
      openTemplate(body.template);
    });
  }

  async function deleteTemplate(id: string) {
    await runLibraryAction(async () => {
      await fetch(`/api/trading/playbooks/templates/${id}`, { method: "DELETE" });
      if (selectedTemplate?.id === id) {
        setEditorOpen(false);
        setSelectedTemplate(null);
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

  function renderRow(template: PlaybookTemplate, isUser: boolean) {
    return (
      <div
        key={template.id}
        className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--edge-border-subtle)] py-2 last:border-b-0"
        data-testid={`risk-policy-row-${template.id}`}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-[var(--edge-text-primary)]">{template.name}</div>
          <div className="text-[10px] text-[var(--edge-text-muted)]">
            {completenessSummary(template)}
            {isUser ? " · My policy" : " · Built-in"}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <EdgeButton
            type="button"
            variant="secondary"
            disabled={libraryBusy}
            onClick={() => openTemplate(template)}
            data-testid={`risk-policy-open-${template.id}`}
          >
            Open
          </EdgeButton>
          <EdgeButton
            type="button"
            variant="secondary"
            disabled={libraryBusy}
            onClick={() => void duplicateTemplate(template.id)}
            data-testid={`risk-policy-duplicate-${template.id}`}
          >
            Duplicate
          </EdgeButton>
          {isUser ? (
            <EdgeButton
              type="button"
              variant="secondary"
              disabled={libraryBusy}
              onClick={() => void deleteTemplate(template.id)}
              data-testid={`risk-policy-delete-${template.id}`}
            >
              Delete
            </EdgeButton>
          ) : null}
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
        <EdgeButton
          type="button"
          variant="secondary"
          disabled={libraryBusy}
          onClick={() => void createFromPreset()}
          data-testid="risk-policy-create"
        >
          New policy…
        </EdgeButton>
      </div>
      <p className="text-[10px] text-[var(--edge-text-muted)]">
        Reusable Protect + Manage recipes. Apply from the chart Plan panel on a long/short drawing.
      </p>
      <div className="rounded border border-[var(--edge-border-subtle)] px-2">
        <div className="py-1 text-[10px] uppercase text-[var(--edge-text-secondary)]">
          Built-in
        </div>
        {presets.map((template) => renderRow(template, false))}
      </div>
      {userTemplates.length > 0 ? (
        <div className="rounded border border-[var(--edge-border-subtle)] px-2">
          <div className="py-1 text-[10px] uppercase text-[var(--edge-text-secondary)]">
            My policies
          </div>
          {userTemplates.map((template) => renderRow(template, true))}
        </div>
      ) : (
        <p className="text-[10px] text-[var(--edge-text-muted)]">No custom policies yet.</p>
      )}
      {selectedTemplate ? (
        <PlaybookTemplateEditor
          open={editorOpen}
          template={selectedTemplate}
          positionPlan={null}
          onClose={() => setEditorOpen(false)}
          onSave={saveEditedTemplate}
          disabled={libraryBusy}
        />
      ) : null}
    </section>
  );
}
