"use client";

import { useMemo, useState } from "react";
import { PlusIcon } from "../chart-chrome/ChartHeaderIcons";
import { TrashIcon } from "../chart-icons/ChartToolIcons";
import { EdgeButton, EdgeIconButton } from "../design-system";
import type { CopilotThreadSummary } from "@/lib/persistence/schemas/copilotThreads";

type Props = {
  threadId: string;
  threads: CopilotThreadSummary[];
  disabled?: boolean;
  onNewChat: () => void;
  onSwitchThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
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

export function CopilotHistoryRail({
  threadId,
  threads,
  disabled = false,
  onNewChat,
  onSwitchThread,
  onDeleteThread,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const sortedThreads = useMemo(
    () =>
      [...threads].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      ),
    [threads],
  );

  if (collapsed) {
    return (
      <aside
        data-testid="copilot-history-rail"
        data-collapsed="true"
        className="copilot-history-rail flex w-10 shrink-0 flex-col border-r border-[var(--edge-border)] bg-[var(--copilot-canvas-bg)]"
      >
        <div className="flex flex-col items-center gap-2 px-1 py-[var(--edge-space-3)]">
          <EdgeIconButton
            type="button"
            aria-label="Expand history"
            title="Expand history"
            data-testid="copilot-history-expand"
            onClick={() => setCollapsed(false)}
          >
            <CollapseIcon collapsed />
          </EdgeIconButton>
          <EdgeIconButton
            type="button"
            aria-label="New chat"
            title="New chat"
            data-testid="copilot-history-new-chat"
            disabled={disabled}
            onClick={onNewChat}
          >
            <PlusIcon />
          </EdgeIconButton>
        </div>
      </aside>
    );
  }

  return (
    <aside
      data-testid="copilot-history-rail"
      data-collapsed="false"
      className="copilot-history-rail flex w-[var(--copilot-history-rail-width)] shrink-0 flex-col border-r border-[var(--edge-border)] bg-[var(--copilot-canvas-bg)]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--edge-border)] px-[var(--edge-space-3)] py-[var(--edge-space-3)]">
        <EdgeButton
          type="button"
          variant="secondary"
          data-testid="copilot-history-new-chat"
          disabled={disabled}
          onClick={onNewChat}
          className="min-w-0 flex-1 justify-center"
        >
          New chat
        </EdgeButton>
        <EdgeIconButton
          type="button"
          aria-label="Collapse history"
          title="Collapse history"
          data-testid="copilot-history-collapse"
          onClick={() => setCollapsed(true)}
        >
          <CollapseIcon collapsed={false} />
        </EdgeIconButton>
      </div>
      <div
        data-testid="copilot-history-list"
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2"
      >
        {sortedThreads.length === 0 ? (
          <p className="px-2 py-3 text-xs text-[var(--edge-text-tertiary)]">No conversations yet</p>
        ) : (
          sortedThreads.map((thread) => {
            const isActive = thread.id === threadId;
            return (
              <div
                key={thread.id}
                className={`group flex min-w-0 items-center gap-1 rounded px-2 py-2 ${
                  isActive
                    ? "bg-[var(--edge-surface-raised)] text-[var(--edge-text-primary)]"
                    : "text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-raised)]"
                }`}
              >
                <button
                  type="button"
                  data-testid={`copilot-history-thread-${thread.id}`}
                  data-active={isActive ? "true" : undefined}
                  className="min-w-0 flex-1 truncate text-left text-sm"
                  disabled={disabled || isActive}
                  onClick={() => onSwitchThread(thread.id)}
                  aria-current={isActive ? "true" : undefined}
                >
                  {thread.title}
                </button>
                <EdgeIconButton
                  type="button"
                  aria-label={`Delete ${thread.title}`}
                  title="Delete"
                  data-testid={`copilot-history-delete-${thread.id}`}
                  className="opacity-0 group-hover:opacity-100"
                  disabled={disabled}
                  onClick={() => onDeleteThread(thread.id)}
                >
                  <TrashIcon size={14} />
                </EdgeIconButton>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
