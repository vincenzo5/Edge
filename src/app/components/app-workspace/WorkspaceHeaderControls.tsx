"use client";

import { useAppWorkspace } from "./AppWorkspaceContext";
import WorkspaceLayoutPresetPicker from "./WorkspaceLayoutPresetPicker";
import WorkspacePill from "./WorkspacePill";

export default function WorkspaceHeaderControls() {
  const { document, layoutEditMode, toggleLayoutEditMode } = useAppWorkspace();
  const isEdit = layoutEditMode === "edit";

  if (isEdit) {
    return (
      <div
        data-testid="workspace-header-controls"
        className="flex max-w-2xl items-center gap-2"
      >
        <span
          data-testid="workspace-editing-label"
          className="truncate text-xs text-[var(--edge-text-muted)]"
        >
          Editing · {document.name}
        </span>
        <WorkspaceLayoutPresetPicker />
        <button
          type="button"
          data-testid="workspace-layout-done"
          className="ml-auto rounded border border-[var(--edge-accent)] bg-[var(--edge-accent-muted)] px-2 py-0.5 text-[10px] text-[var(--edge-text-primary)]"
          onClick={() => toggleLayoutEditMode()}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="workspace-header-controls"
      className="flex max-w-2xl items-center gap-2"
    >
      <WorkspacePill />
      <button
        type="button"
        data-testid="workspace-layout-edit"
        className="ml-auto rounded border border-[var(--edge-border-subtle)] px-2 py-0.5 text-[10px] text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)]"
        onClick={() => toggleLayoutEditMode()}
      >
        Edit layout
      </button>
    </div>
  );
}
