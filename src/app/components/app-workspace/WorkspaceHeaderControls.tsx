"use client";

import { useAppWorkspace } from "./AppWorkspaceContext";
import WorkspaceLayoutPresetPicker from "./WorkspaceLayoutPresetPicker";
import WorkspacePill from "./WorkspacePill";
import { bodyTextClass, compactControlClass } from "../design-system/styles";

export default function WorkspaceHeaderControls() {
  const {
    document,
    layoutEditMode,
    enterLayoutEdit,
    requestExitLayoutEdit,
  } = useAppWorkspace();
  const isEdit = layoutEditMode === "edit";

  if (isEdit) {
    return (
      <div
        data-testid="workspace-header-controls"
        className="flex max-w-2xl items-center gap-2"
      >
        <span
          data-testid="workspace-editing-label"
          className={`truncate ${bodyTextClass()} text-[var(--edge-text-muted)]`}
        >
          Editing · {document.name}
        </span>
        <WorkspaceLayoutPresetPicker />
        <button
          type="button"
          data-testid="workspace-layout-done"
          className={`ml-auto rounded-[var(--edge-radius-sm)] border border-[var(--edge-accent-blue)] bg-[var(--edge-surface-active)] px-[var(--edge-space-2)] ${compactControlClass()} ${bodyTextClass()} text-[var(--edge-text-primary)]`}
          onClick={() => requestExitLayoutEdit()}
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
        className={`ml-auto rounded-[var(--edge-radius-sm)] border border-[var(--edge-border-subtle)] px-[var(--edge-space-2)] ${compactControlClass()} ${bodyTextClass()} text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)]`}
        onClick={() => enterLayoutEdit()}
      >
        Edit layout
      </button>
    </div>
  );
}
