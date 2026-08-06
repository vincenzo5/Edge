"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PencilIcon } from "../chart-chrome/ChartHeaderIcons";
import { TrashIcon } from "../chart-icons/ChartToolIcons";
import { EdgeIconButton } from "../design-system";
import EdgeAnchoredPopover from "../design-system/EdgeAnchoredPopover";
import { menuItemClass } from "../design-system/styles";
import {
  groupCopilotThreadsByRecency,
  limitCopilotThreads,
  readCopilotHistoryRailCollapsed,
  readCopilotHistorySectionCollapsed,
  writeCopilotHistoryRailCollapsed,
  writeCopilotHistorySectionCollapsed,
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

function SectionChevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d={collapsed ? "M6 4l4 4-4 4" : "M4 6l4 4 4-4"}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Grok-style thin magnifying glass for history nav rows. */
function HistorySearchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M15.25 15.25L20 20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Grok-style compose / new-chat icon (rounded square + pencil). */
function ComposeChatIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5.5 7.25c0-.97.78-1.75 1.75-1.75h6.5c.97 0 1.75.78 1.75 1.75v6.5c0 .97-.78 1.75-1.75 1.75h-6.5A1.75 1.75 0 0 1 5.5 13.75v-6.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M13.25 10.75 19.5 4.5l1.5 1.5-6.25 6.25H13.25v-1.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
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
        className="cursor-pointer opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 data-[open=true]:opacity-100 disabled:cursor-not-allowed"
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
      className={`group copilot-history-thread-row ${isActive ? "is-active" : ""} ${
        disabled ? "is-disabled" : ""
      }`}
    >
      <button
        type="button"
        data-testid={`copilot-history-thread-${thread.id}`}
        data-active={isActive ? "true" : undefined}
        className="min-w-0 flex-1 cursor-pointer truncate text-left disabled:cursor-default"
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
  onRenameThread,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [historySectionCollapsed, setHistorySectionCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readCopilotHistoryRailCollapsed());
    setHistorySectionCollapsed(readCopilotHistorySectionCollapsed());
  }, []);

  const setCollapsedState = (next: boolean) => {
    setCollapsed(next);
    writeCopilotHistoryRailCollapsed(next);
  };

  const setHistorySectionCollapsedState = (next: boolean) => {
    setHistorySectionCollapsed(next);
    writeCopilotHistorySectionCollapsed(next);
  };

  const { visible: visibleThreads } = useMemo(
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
            className="cursor-pointer"
            onClick={() => setCollapsedState(false)}
          >
            <CollapseIcon collapsed />
          </EdgeIconButton>
          <EdgeIconButton
            type="button"
            aria-label="Search chats"
            title="Search"
            data-testid="copilot-history-search"
            className="cursor-pointer disabled:cursor-not-allowed"
            disabled={disabled}
            onClick={onSearchOpen}
          >
            <HistorySearchIcon size={16} />
          </EdgeIconButton>
          <EdgeIconButton
            type="button"
            aria-label="New chat"
            title="New chat"
            data-testid="copilot-history-new-chat"
            className="cursor-pointer disabled:cursor-not-allowed"
            disabled={disabled}
            onClick={onNewChat}
          >
            <ComposeChatIcon size={16} />
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
      <div className="flex items-center justify-between gap-1 px-[var(--edge-space-3)] pb-2 pt-[var(--edge-space-3)]">
        <h2
          data-testid="copilot-history-title"
          className="px-3 text-sm font-bold text-[var(--edge-text-primary)]"
        >
          Copilot
        </h2>
        <EdgeIconButton
          type="button"
          aria-label="Collapse history"
          title="Collapse history"
          data-testid="copilot-history-collapse"
          className="cursor-pointer"
          onClick={() => setCollapsedState(true)}
        >
          <CollapseIcon collapsed={false} />
        </EdgeIconButton>
      </div>

      <div className="flex flex-col gap-0.5 px-[var(--edge-space-3)] pb-2">
        <button
          type="button"
          data-testid="copilot-history-search"
          disabled={disabled}
          onClick={onSearchOpen}
          className="copilot-history-nav-btn edge-focus-ring cursor-pointer disabled:cursor-not-allowed"
        >
          <HistorySearchIcon />
          Search
        </button>
        <button
          type="button"
          data-testid="copilot-history-new-chat"
          disabled={disabled}
          onClick={onNewChat}
          className="copilot-history-nav-btn edge-focus-ring cursor-pointer disabled:cursor-not-allowed"
        >
          <ComposeChatIcon />
          New Chat
        </button>
      </div>

      <div className="px-[var(--edge-space-3)] pb-1">
        <button
          type="button"
          data-testid="copilot-history-section-toggle"
          aria-expanded={!historySectionCollapsed}
          aria-controls="copilot-history-list"
          onClick={() => setHistorySectionCollapsedState(!historySectionCollapsed)}
          className="copilot-history-section-toggle edge-focus-ring cursor-pointer"
        >
          <span>History</span>
          <SectionChevron collapsed={historySectionCollapsed} />
        </button>
      </div>

      {!historySectionCollapsed ? (
        <div
          id="copilot-history-list"
          data-testid="copilot-history-list"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[var(--edge-space-3)] pb-2"
        >
          <div className="flex flex-col gap-3">
            {visibleGroups.length === 0 ? (
              <p className="px-3 py-3 text-xs text-[var(--edge-text-muted)]">
                No conversations yet
              </p>
            ) : (
              visibleGroups.map((group) => (
                <section key={group.bucket} data-testid={`copilot-history-group-${group.bucket}`}>
                  <div className="mb-1 flex items-center gap-2 px-3">
                    <span className="text-xs text-[var(--edge-text-muted)]">{group.label}</span>
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
          <button
            type="button"
            data-testid="copilot-history-see-all"
            disabled={disabled}
            onClick={onSearchOpen}
            className="copilot-history-see-all edge-focus-ring mt-0.5 w-full cursor-pointer px-3 py-2 text-left text-sm font-medium text-[var(--edge-text-muted)] transition-colors hover:text-[var(--edge-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            See all
          </button>
        </div>
      ) : null}
    </aside>
  );
}
