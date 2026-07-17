"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import EdgeMenuItem from "../design-system/EdgeMenuItem";
import EdgeMenuSectionHeader from "../design-system/EdgeMenuSectionHeader";
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
          className="surface-popover fixed z-[210] min-w-[12rem] rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-panel)] py-1 shadow-lg"
          style={{ top: menuStyle.top, left: menuStyle.left }}
        >
          {menuView === "rename" ? (
            <div className="px-2 py-1">
              <EdgeMenuSectionHeader label="Rename workspace" />
              <input
                ref={renameInputRef}
                aria-label="Workspace name"
                data-testid="workspace-rename-input"
                className="mt-1 w-full rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface)] px-2 py-1 text-xs text-[var(--edge-text-primary)]"
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
                    className={`edge-focus-ring flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[var(--edge-surface-hover)] ${
                      isActive
                        ? "bg-[var(--edge-surface-active)] text-[var(--edge-text-strong)]"
                        : "text-[var(--edge-text-primary)]"
                    }`}
                    onClick={() => handleSwitch(doc.id)}
                  >
                    <span
                      aria-hidden
                      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                        isActive ? "bg-[var(--edge-accent)]" : "bg-transparent"
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
      <button
        ref={triggerRef}
        type="button"
        data-testid="workspace-pill"
        aria-haspopup="menu"
        aria-expanded={open}
        className="edge-focus-ring flex max-w-[14rem] items-center gap-1 rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface)] px-2 py-0.5 text-xs text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-hover)]"
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
      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
