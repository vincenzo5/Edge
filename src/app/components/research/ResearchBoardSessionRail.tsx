"use client";

import { useMemo, useState } from "react";

import type { ResearchSessionSummary } from "@/lib/persistence/schemas/researchSessions";
import { EdgeButton, EdgeIconButton } from "../design-system";

type Props = {
  sessionId: string;
  sessions: ResearchSessionSummary[];
  primaryThreadId: string | null;
  disabled?: boolean;
  onNewSession: () => void;
  onSwitchSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, title: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenTalk: (threadId: string) => void;
};

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d={collapsed ? "M6 4l4 4-4 4" : "M10 4L6 8l4 4"}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ResearchBoardSessionRail({
  sessionId,
  sessions,
  primaryThreadId,
  disabled = false,
  onNewSession,
  onSwitchSession,
  onRenameSession,
  onDeleteSession,
  onOpenTalk,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      ),
    [sessions],
  );

  const beginRename = (entry: ResearchSessionSummary) => {
    setEditingId(entry.id);
    setDraftTitle(entry.title);
  };

  const commitRename = () => {
    if (!editingId) return;
    onRenameSession(editingId, draftTitle);
    setEditingId(null);
    setDraftTitle("");
  };

  if (collapsed) {
    return (
      <aside
        data-testid="research-session-rail"
        data-collapsed="true"
        className="flex w-10 shrink-0 flex-col border-r border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)]"
      >
        <div className="flex flex-col items-center gap-2 px-1 py-[var(--edge-space-3)]">
          <EdgeIconButton
            type="button"
            aria-label="Expand sessions"
            title="Expand sessions"
            data-testid="research-session-expand"
            onClick={() => setCollapsed(false)}
          >
            <CollapseIcon collapsed />
          </EdgeIconButton>
        </div>
      </aside>
    );
  }

  return (
    <aside
      data-testid="research-session-rail"
      data-collapsed="false"
      className="flex w-56 shrink-0 flex-col border-r border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--edge-border)] px-[var(--edge-space-3)] py-[var(--edge-space-3)]">
        <EdgeButton
          type="button"
          variant="secondary"
          data-testid="research-session-new"
          disabled={disabled}
          onClick={onNewSession}
          className="min-w-0 flex-1 justify-center"
        >
          New session
        </EdgeButton>
        <EdgeIconButton
          type="button"
          aria-label="Collapse sessions"
          title="Collapse sessions"
          data-testid="research-session-collapse"
          onClick={() => setCollapsed(true)}
        >
          <CollapseIcon collapsed={false} />
        </EdgeIconButton>
      </div>

      {primaryThreadId ? (
        <div className="border-b border-[var(--edge-border)] px-[var(--edge-space-3)] py-2">
          <button
            type="button"
            data-testid="research-session-open-talk"
            className="w-full rounded px-2 py-1.5 text-left text-xs text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-raised)]"
            onClick={() => onOpenTalk(primaryThreadId)}
          >
            Open Talk
          </button>
        </div>
      ) : null}

      <div
        data-testid="research-session-list"
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2"
      >
        {sortedSessions.length === 0 ? (
          <p className="px-2 py-3 text-xs text-[var(--edge-text-tertiary)]">No sessions yet</p>
        ) : (
          sortedSessions.map((entry) => {
            const isActive = entry.id === sessionId;
            return (
              <div
                key={entry.id}
                data-testid={`research-session-item-${entry.id}`}
                data-active={isActive ? "true" : "false"}
                className={`group rounded px-2 py-1.5 ${
                  isActive
                    ? "bg-[var(--edge-surface-raised)] text-[var(--edge-text-strong)]"
                    : "text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-raised)]"
                }`}
              >
                {editingId === entry.id ? (
                  <input
                    data-testid={`research-session-rename-${entry.id}`}
                    className="w-full rounded border border-[var(--edge-border)] bg-[var(--edge-surface-base)] px-2 py-1 text-xs"
                    value={draftTitle}
                    autoFocus
                    onChange={(event) => setDraftTitle(event.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitRename();
                      if (event.key === "Escape") {
                        setEditingId(null);
                        setDraftTitle("");
                      }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => onSwitchSession(entry.id)}
                    onDoubleClick={() => beginRename(entry)}
                  >
                    <div className="truncate text-xs font-medium">{entry.title}</div>
                    <div className="text-[10px] text-[var(--edge-text-tertiary)]">
                      {entry.cardCount} card{entry.cardCount === 1 ? "" : "s"}
                    </div>
                  </button>
                )}
                <div className="mt-1 hidden gap-1 group-hover:flex">
                  <button
                    type="button"
                    className="rounded px-1.5 py-0.5 text-[10px] hover:bg-[var(--edge-surface-base)]"
                    onClick={() => beginRename(entry)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="rounded px-1.5 py-0.5 text-[10px] text-[var(--edge-danger-text)] hover:bg-[var(--edge-surface-base)]"
                    onClick={() => onDeleteSession(entry.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
