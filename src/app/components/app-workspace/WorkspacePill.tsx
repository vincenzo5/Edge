"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import EdgeBorderLabeledControl from "../design-system/EdgeBorderLabeledControl";
import EdgeMenuItem from "../design-system/EdgeMenuItem";
import EdgeMenuSectionHeader from "../design-system/EdgeMenuSectionHeader";
import { bodyTextClass, headerChipClass } from "../design-system/styles";
import { useAppWorkspace } from "./AppWorkspaceContext";

type MenuView = "list" | "rename";

export default function WorkspacePill() {
  const {
    document: activeDocument,
    state,
    switchWorkspaceDocument,
    renameWorkspaceDocument,
    createWorkspaceDocument,
    duplicateWorkspaceDocument,
  } = useAppWorkspace();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>("list");
  const [renameDraft, setRenameDraft] = useState(activeDocument.name);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();

  const close = useCallback(() => {
    setOpen(false);
    setMenuView("list");
    setRenameDraft(activeDocument.name);
  }, [activeDocument.name]);

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

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (menuView === "rename") {
          setMenuView("list");
          setRenameDraft(activeDocument.name);
        } else {
          close();
        }
      }
    };
    window.document.addEventListener("keydown", handleKeyDown);
    return () => window.document.removeEventListener("keydown", handleKeyDown);
  }, [open, menuView, activeDocument.name, close]);

  useEffect(() => {
    if (open && menuView === "rename") {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [open, menuView]);

  useEffect(() => {
    if (!open) {
      setRenameDraft(activeDocument.name);
    }
  }, [activeDocument.name, open]);

  const handleSwitch = (documentId: string) => {
    switchWorkspaceDocument(documentId);
    close();
  };

  const commitRename = () => {
    const trimmed = renameDraft.trim();
    if (trimmed && trimmed !== activeDocument.name) {
      renameWorkspaceDocument(trimmed);
    }
    close();
  };

  const handleNew = () => {
    createWorkspaceDocument();
    close();
  };

  const handleDuplicate = () => {
    duplicateWorkspaceDocument();
    close();
  };

  const menu =
    open && menuStyle ? (
      <>
        <button
          type="button"
          aria-label="Close workspace menu"
          className="fixed inset-0 z-[200] cursor-default bg-transparent"
          onClick={close}
        />
        <div
          data-testid="workspace-pill-menu"
          role="menu"
          aria-label="Workspace menu"
          className="edge-popover fixed z-[210] min-w-[12rem] rounded-[var(--edge-radius-lg)] border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-panel)] py-1 shadow-[var(--edge-shadow-popover)]"
          style={{ top: menuStyle.top, left: menuStyle.left }}
        >
          {menuView === "rename" ? (
            <div className="px-2 py-1">
              <EdgeMenuSectionHeader label="Rename workspace" />
              <input
                ref={renameInputRef}
                aria-label="Workspace name"
                data-testid="workspace-rename-input"
                className="mt-1 w-full rounded-[var(--edge-radius-sm)] border border-[var(--edge-border-subtle)] bg-transparent px-[var(--edge-space-2)] py-[var(--edge-space-1)] text-[var(--edge-text-primary)] edge-type-body"
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                }}
              />
            </div>
          ) : (
            <>
              <EdgeMenuSectionHeader label="Workspaces" />
              {state.documents.map((doc) => {
                const isActive = doc.id === state.activeDocumentId;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    data-testid={`workspace-pill-option-${doc.id}`}
                    className={`edge-focus-ring flex w-full min-h-[var(--edge-control-height-compact)] items-center gap-[var(--edge-space-2)] px-[var(--edge-space-3)] text-left ${bodyTextClass()} hover:bg-[var(--edge-surface-hover)] ${
                      isActive
                        ? "bg-[var(--edge-surface-active)] text-[var(--edge-text-strong)]"
                        : "text-[var(--edge-text-primary)]"
                    }`}
                    onClick={() => handleSwitch(doc.id)}
                  >
                    <span
                      aria-hidden
                      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                        isActive ? "bg-[var(--edge-accent-blue)]" : "bg-transparent"
                      }`}
                    />
                    <span className="truncate">{doc.name}</span>
                  </button>
                );
              })}
              <div className="my-1 border-t border-[var(--edge-border-subtle)]" />
              <EdgeMenuItem
                label="Rename…"
                onClick={() => {
                  setRenameDraft(activeDocument.name);
                  setMenuView("rename");
                }}
              />
              <EdgeMenuItem label="New workspace" onClick={handleNew} />
              <EdgeMenuItem label="Duplicate" onClick={handleDuplicate} />
            </>
          )}
        </div>
      </>
    ) : null;

  return (
    <div className="relative">
      <EdgeBorderLabeledControl label="Workspace" labelId={labelId} labelSurface="toolbar">
        <button
          ref={triggerRef}
          type="button"
          data-testid="workspace-pill"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-labelledby={labelId}
          className={`edge-focus-ring ${headerChipClass()} max-w-[14rem] border-[var(--edge-border-subtle)] bg-transparent`}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="min-w-0 flex-1 truncate text-left">{activeDocument.name}</span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden
            className={`shrink-0 text-[var(--edge-text-secondary)] transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path
              d="M2 3.5L5 6.5L8 3.5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </EdgeBorderLabeledControl>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
