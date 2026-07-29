"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EdgeSearchInput } from "../design-system";
import EdgeModalShell from "../design-system/EdgeModalShell";
import { CompactSearchIcon } from "../design-system";
import {
  formatCopilotRelativeTime,
  searchCopilotThreads,
  type CopilotThreadSearchResult,
} from "@/lib/copilot/searchCopilotThreads";
import type { CopilotThreadSummary } from "@/lib/persistence/schemas/copilotThreads";

type Props = {
  open: boolean;
  threads: CopilotThreadSummary[];
  activeThreadId: string;
  disabled?: boolean;
  onClose: () => void;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
};

export function CopilotHistorySearchModal({
  open,
  threads,
  activeThreadId,
  disabled = false,
  onClose,
  onSelectThread,
  onNewChat,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [focusedThreadId, setFocusedThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setFocusedThreadId(null);
      return;
    }
    setFocusedThreadId(activeThreadId || threads[0]?.id || null);
  }, [activeThreadId, open, threads]);

  const results = useMemo(
    () => searchCopilotThreads(threads, query),
    [query, threads],
  );

  const preview = useMemo(() => {
    const targetId = focusedThreadId ?? results[0]?.thread.id ?? null;
    if (!targetId) return null;
    return results.find((entry) => entry.thread.id === targetId) ?? null;
  }, [focusedThreadId, results]);

  const handleSelect = (result: CopilotThreadSearchResult) => {
    if (disabled) return;
    onSelectThread(result.thread.id);
  };

  return (
    <EdgeModalShell
      open={open}
      title="Search chats"
      ariaLabel="Search Copilot chats"
      onClose={onClose}
      maxWidth="full"
      testId="copilot-history-search-modal"
      initialFocusRef={searchRef}
    >
      <div className="flex min-h-[420px] flex-col gap-4 md:min-h-[520px] md:flex-row">
        <div className="flex min-h-0 w-full flex-col border-[var(--edge-border)] md:w-[42%] md:border-r md:pr-4">
          <EdgeSearchInput
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => setQuery("")}
            placeholder="Search…"
            aria-label="Search chats"
            disabled={disabled}
            leadingIcon={<CompactSearchIcon />}
            data-testid="copilot-history-search-input"
          />

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--edge-text-tertiary)]">History</span>
            <button
              type="button"
              data-testid="copilot-history-search-new-chat"
              disabled={disabled}
              onClick={() => {
                onNewChat();
                onClose();
              }}
              className="edge-focus-ring text-xs text-[var(--edge-text-secondary)] hover:text-[var(--edge-text-primary)]"
            >
              New chat
            </button>
          </div>

          <div
            data-testid="copilot-history-search-results"
            className="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
          >
            {results.length === 0 ? (
              <p className="px-2 py-6 text-sm text-[var(--edge-text-tertiary)]">
                No conversations match your search.
              </p>
            ) : (
              results.map((result) => {
                const isFocused = (focusedThreadId ?? results[0]?.thread.id) === result.thread.id;
                const isActive = result.thread.id === activeThreadId;
                return (
                  <button
                    key={result.thread.id}
                    type="button"
                    data-testid={`copilot-history-search-result-${result.thread.id}`}
                    data-active={isActive ? "true" : undefined}
                    disabled={disabled}
                    onMouseEnter={() => setFocusedThreadId(result.thread.id)}
                    onFocus={() => setFocusedThreadId(result.thread.id)}
                    onClick={() => handleSelect(result)}
                    className={`edge-focus-ring flex w-full items-start justify-between gap-3 rounded px-3 py-2 text-left ${
                      isFocused
                        ? "bg-[var(--edge-surface-raised)] text-[var(--edge-text-primary)]"
                        : "text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-raised)]"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{result.thread.title}</span>
                    <span className="shrink-0 text-xs text-[var(--edge-text-tertiary)]">
                      {formatCopilotRelativeTime(result.thread.updatedAt)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div
          data-testid="copilot-history-search-preview"
          className="flex min-h-[180px] flex-1 items-center justify-center rounded-[var(--edge-radius-lg)] border border-[var(--edge-border)] bg-[var(--edge-surface-raised)] px-6 py-8 text-center md:min-h-0 md:border-0 md:bg-transparent"
        >
          {preview ? (
            <div className="max-w-xl text-left">
              <h3 className="text-base font-medium text-[var(--edge-text-primary)]">
                {preview.thread.title}
              </h3>
              <p className="mt-1 text-xs text-[var(--edge-text-tertiary)]">
                {formatCopilotRelativeTime(preview.thread.updatedAt)}
              </p>
              {preview.snippet ? (
                <p className="mt-4 text-sm leading-relaxed text-[var(--edge-text-secondary)]">
                  {preview.snippet}
                </p>
              ) : (
                <p className="mt-4 text-sm text-[var(--edge-text-tertiary)]">
                  Open this conversation to continue where you left off.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--edge-text-tertiary)]">
              Select a conversation to preview
            </p>
          )}
        </div>
      </div>
    </EdgeModalShell>
  );
}
