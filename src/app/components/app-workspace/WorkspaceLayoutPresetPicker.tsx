"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  WORKSPACE_LAYOUT_PRESETS,
  type WorkspaceLayoutPresetId,
} from "@/lib/appWorkspace/layoutPresets";
import { useAppWorkspace } from "./AppWorkspaceContext";
import WorkspaceLayoutPresetIcon from "./WorkspaceLayoutPresetIcon";
import { annotationTextClass, headerChipClass, popoverPanelClass } from "../design-system/styles";

type Props = {
  activePresetId?: WorkspaceLayoutPresetId | null;
};

export default function WorkspaceLayoutPresetPicker({ activePresetId = null }: Props) {
  const { applyWorkspaceLayoutPreset } = useAppWorkspace();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setMenuStyle({ top: rect.bottom + 4, left: rect.left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  const handleSelect = useCallback(
    (presetId: WorkspaceLayoutPresetId) => {
      applyWorkspaceLayoutPreset(presetId);
      setOpen(false);
    },
    [applyWorkspaceLayoutPreset],
  );

  const menu =
    open && menuStyle ? (
      <>
        <button
          type="button"
          aria-label="Close layout picker"
          className="fixed inset-0 z-[200] cursor-default bg-transparent"
          onClick={() => setOpen(false)}
        />
        <div
          role="dialog"
          aria-label="Workspace layout presets"
          data-testid="workspace-layout-preset-menu"
          className={`${popoverPanelClass("dark")} fixed z-[210] min-w-[220px] p-2 shadow-[var(--edge-shadow-popover)]`}
          style={{ top: menuStyle.top, left: menuStyle.left }}
        >
          <p className={`mb-2 px-1 ${annotationTextClass()} font-medium uppercase tracking-wide text-[var(--edge-text-muted)]`}>
            Layout structure
          </p>
          <p className={`mb-2 px-1 ${annotationTextClass()} text-[var(--edge-text-secondary)]`}>
            Geometry presets leave empty panes; workflow presets seed Chart / Screener / Journal.
          </p>
          <div className="grid max-h-[280px] grid-cols-5 gap-1 overflow-y-auto">
            {WORKSPACE_LAYOUT_PRESETS.map((preset) => {
              const selected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`workspace-layout-preset-${preset.id}`}
                  title={preset.label}
                  aria-label={preset.label}
                  aria-pressed={selected}
                  className={`flex h-8 w-8 items-center justify-center rounded border transition-colors ${
                    selected
                      ? "surface-active border-[var(--edge-accent-blue)] text-[var(--edge-text-primary)]"
                      : "border-[var(--edge-border-subtle)] text-[var(--edge-text-secondary)] hover:surface-hover"
                  }`}
                  onClick={() => handleSelect(preset.id)}
                >
                  <WorkspaceLayoutPresetIcon preview={preset.preview} size={18} />
                </button>
              );
            })}
          </div>
        </div>
      </>
    ) : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        data-testid="workspace-layout-preset-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Choose layout structure"
        className={headerChipClass()}
        onClick={() => setOpen((value) => !value)}
      >
        Layout ▾
      </button>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
