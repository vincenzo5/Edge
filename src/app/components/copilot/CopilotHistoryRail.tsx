"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { PencilIcon, PlusIcon } from "../chart-chrome/ChartHeaderIcons";
import { TrashIcon } from "../chart-icons/ChartToolIcons";
import { CompactSearchIcon, EdgeButton, EdgeIconButton } from "../design-system";
import EdgeAnchoredPopover from "../design-system/EdgeAnchoredPopover";
import { menuItemClass } from "../design-system/styles";
import {
  groupCopilotThreadsByRecency,
  limitCopilotThreads,
  readCopilotHistoryRailCollapsed,
  writeCopilotHistoryRailCollapsed,
} from "@/lib/copilot/groupCopilotThreadsByRecency";
import type { CopilotThreadSummary } from "@/lib/persistence/schemas/copilotThreads";

type Props = {
  threadId: string;
  threads: CopilotThreadSummary[];
  disabled?: boolean;
  onNewChat: () => void;
  onSwitchThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onSearchOpen: () => void;
  onSeeAll: () => void;
  onRenameThread: (threadId: string) => void;
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

function MoreIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="3" cy="7" r="1" fill="currentColor" />
      <circle cx="7" cy="7" r="1" fill="currentColor" />
      <circle cx="11" cy="7" r="1" fill="currentColor" />
    </svg>
  );
}

function ThreadOverflowMenu({
  thread,
  disabled,
  onRename,
  onDelete,
}: {
  thread: CopilotThreadSummary;
  disabled: boolean;
  onRename: () => void;
  onDelete: () => void;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <EdgeIconButton
        ref={anchorRef}
        type="button"
        aria-label={`Actions for ${thread.title}`}
        title="Thread actions"
        data-testid={`copilot-history-menu-${thread.id}`}
        className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 data-[open=true]:opacity-100"
        data-open={open ? "true" : undefined}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreIcon />
      </EdgeIconButton>
      <EdgeAnchoredPopover
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        align="end"
        minWidth={168}
      >
        <div className="py-1">
          <button
            type="button"
            className={`${menuItemClass("dark")} flex w-full items-center gap-2 px-3 py-2 text-left text-sm`}
            data-testid={`copilot-history-rename-${thread.id}`}
            onClick={() => {
              setOpen(false);
              onRename();
            }}
          >
            <PencilIcon size={14} />
            Rename
          </button>
          <button
            type="button"
            className={`${menuItemClass("dark")} flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--edge-negative)]`}
            data-testid={`copilot-history-delete-${thread.id}`}
            data-danger="true"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <TrashIcon size={14} />
            Delete
          </button>
        </div>
      </EdgeAnchoredPopover>
    </>
  );
}

function ThreadRow({
  thread,
  isActive,
  disabled,
  onSwitchThread,
  onDeleteThread,
  onRenameThread,
}: {
  thread: CopilotThreadSummary;
  isActive: boolean;
  disabled: boolean;
  onSwitchThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onRenameThread: (threadId: string) => void;
}) {
  return (
    <div
      className={`group flex min-w-0 items-center gap-1 rounded px-2 py-1.5 ${
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
      <ThreadOverflowMenu
        thread={thread}
        disabled={disabled}
        onRename={() => onRenameThread(thread.id)}
        onDelete={() => onDeleteThread(thread.id)}
      />
    </div>
  );
}

export function CopilotHistoryRail({
  threadId,
  threads,
  disabled = false,
  onNewChat,
  onSwitchThread,
  onDeleteThread,
  onSearchOpen,
  onSeeAll,
  onRenameThread,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readCopilotHistoryRailCollapsed());
  }, []);

  const setCollapsedState = (next: boolean) => {
    setCollapsed(next);
    writeCopilotHistoryRailCollapsed(next);
  };

  const { visible: visibleThreads, hasMore } = useMemo(
    () => limitCopilotThreads(threads),
    [threads],
  );

  const visibleGroups = useMemo(
    () => groupCopilotThreadsByRecency(visibleThreads),
    [visibleThreads],
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
            onClick={() => setCollapsedState(false)}
          >
            <CollapseIcon collapsed />
          </EdgeIconButton>
          <EdgeIconButton
            type="button"
            aria-label="Search chats"
            title="Search"
            data-testid="copilot-history-search"
            disabled={disabled}
            onClick={onSearchOpen}
          >
            <CompactSearchIcon />
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
      <div className="flex items-center justify-between gap-2 px-[var(--edge-space-3)] py-[var(--edge-space-3)]">
        <div className="flex min-w-0 items-center gap-2">
          <Image
            src="/brand/icon-mono-white.svg"
            alt="Edge"
            width={24}
            height={24}
            className="opacity-90"
          />
        </div>
        <EdgeIconButton
          type="button"
          aria-label="Collapse history"
          title="Collapse history"
          data-testid="copilot-history-collapse"
          onClick={() => setCollapsedState(true)}
        >
          <CollapseIcon collapsed={false} />
        </EdgeIconButton>
      </div>

      <div className="flex flex-col gap-2 px-[var(--edge-space-3)] pb-2">
        <button
          type="button"
          data-testid="copilot-history-search"
          disabled={disabled}
          onClick={onSearchOpen}
          className="edge-focus-ring flex w-full items-center gap-2 rounded-[var(--edge-radius-lg)] px-2 py-2 text-sm text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-raised)]"
        >
          <CompactSearchIcon />
          Search
        </button>
        <EdgeButton
          type="button"
          variant="secondary"
          data-testid="copilot-history-new-chat"
          disabled={disabled}
          onClick={onNewChat}
          className="w-full justify-center gap-2"
        >
          <PencilIcon size={14} />
          New chat
        </EdgeButton>
      </div>

      <div className="px-[var(--edge-space-3)] pb-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--edge-text-tertiary)]">History</span>
        </div>
      </div>

      <div
        data-testid="copilot-history-list"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pb-2"
      >
        {visibleGroups.length === 0 ? (
          <p className="px-2 py-3 text-xs text-[var(--edge-text-tertiary)]">No conversations yet</p>
        ) : (
          visibleGroups.map((group) => (
            <section key={group.bucket} data-testid={`copilot-history-group-${group.bucket}`}>
              <div className="mb-1 flex items-center gap-2 px-2">
                <span className="text-xs text-[var(--edge-text-tertiary)]">{group.label}</span>
                <div className="h-px flex-1 bg-[var(--edge-border)]" />
              </div>
              <div className="flex flex-col gap-0.5">
                {group.threads.map((thread) => (
                  <ThreadRow
                    key={thread.id}
                    thread={thread}
                    isActive={thread.id === threadId}
                    disabled={disabled}
                    onSwitchThread={onSwitchThread}
                    onDeleteThread={onDeleteThread}
                    onRenameThread={onRenameThread}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {hasMore || threads.length > 0 ? (
        <div className="border-t border-[var(--edge-border)] px-[var(--edge-space-3)] py-2">
          <button
            type="button"
            data-testid="copilot-history-see-all"
            disabled={disabled}
            onClick={onSeeAll}
            className="edge-focus-ring text-sm text-[var(--edge-text-tertiary)] hover:text-[var(--edge-text-secondary)]"
          >
            See all
          </button>
        </div>
      ) : null}
    </aside>
  );
}
