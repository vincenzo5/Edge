"use client";

import { useEffect, useRef, useState } from "react";
import type { Watchlist } from "@/lib/watchlist/types";
import { MAX_WATCHLISTS } from "@/lib/watchlist/storage";

type Props = {
  watchlists: Watchlist[];
  activeWatchlistId: string;
  activeListName: string;
  onSwitch: (watchlistId: string) => void;
  onCreate: (name: string) => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onClear: () => void;
  onDelete: () => void;
};

function MenuItem({
  label,
  onClick,
  disabled,
  testId,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className="edge-focus-ring flex w-full items-center px-3 py-1.5 text-left text-xs text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1 border-t border-[var(--edge-border)]" />;
}

export default function WatchlistListMenu({
  watchlists,
  activeWatchlistId,
  activeListName,
  onSwitch,
  onCreate,
  onRename,
  onDuplicate,
  onClear,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showOpenList, setShowOpenList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const canCreate = watchlists.length < MAX_WATCHLISTS;
  const canDelete = watchlists.length > 1;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setShowOpenList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const close = () => {
    setOpen(false);
    setShowOpenList(false);
  };

  const handleCreate = () => {
    const name = window.prompt("New watchlist name:", "Watchlist");
    if (name === null) return;
    onCreate(name);
    close();
  };

  const handleRename = () => {
    const name = window.prompt("Rename watchlist:", activeListName);
    if (name === null) return;
    onRename(name);
    close();
  };

  const handleClear = () => {
    if (!window.confirm(`Clear all symbols from "${activeListName}"?`)) return;
    onClear();
    close();
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete watchlist "${activeListName}"?`)) return;
    onDelete();
    close();
  };

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        data-testid="watchlist-list-menu-trigger"
        aria-label={`Watchlist options for ${activeListName}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
        className="edge-focus-ring flex min-w-0 items-center gap-1 rounded-[var(--edge-radius-sm)] px-1.5 py-1 text-left text-xs font-medium text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-strong)]"
      >
        <span data-testid="watchlist-active-name" className="truncate">
          {activeListName}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden className="shrink-0 opacity-60">
          <path d="M3 4.5 6 7.5l3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          data-testid="watchlist-list-menu"
          role="menu"
          className="edge-popover absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-[var(--edge-radius-sm)] border py-1"
        >
          <MenuItem
            testId="watchlist-rename-list"
            label="Rename…"
            onClick={handleRename}
          />
          <MenuItem
            testId="watchlist-duplicate-list"
            label="Make a copy…"
            onClick={() => {
              onDuplicate();
              close();
            }}
            disabled={!canCreate}
          />
          <MenuItem
            testId="watchlist-clear-list"
            label="Clear list"
            onClick={handleClear}
          />
          {canDelete && (
            <MenuItem
              testId="watchlist-delete-list"
              label="Delete list"
              onClick={handleDelete}
            />
          )}

          <MenuDivider />

          <MenuItem
            testId="watchlist-create-list"
            label="Create new list…"
            onClick={handleCreate}
            disabled={!canCreate}
          />

          <MenuDivider />

          <MenuItem
            testId="watchlist-open-list"
            label="Open list…"
            onClick={() => setShowOpenList((prev) => !prev)}
          />

          {showOpenList && (
            <div
              data-testid="watchlist-open-list-panel"
              className="max-h-40 overflow-auto border-t border-[var(--edge-border)]"
            >
              {watchlists.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={list.id === activeWatchlistId}
                  data-testid={`watchlist-switch-${list.id}`}
                  onClick={() => {
                    onSwitch(list.id);
                    close();
                  }}
                  className={`edge-focus-ring flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[var(--edge-surface-hover)] ${
                    list.id === activeWatchlistId
                      ? "font-medium text-[var(--edge-accent-blue)]"
                      : "text-[var(--edge-text-primary)]"
                  }`}
                >
                  {list.id === activeWatchlistId && (
                    <span aria-hidden className="text-[10px]">
                      ✓
                    </span>
                  )}
                  <span className={list.id === activeWatchlistId ? "" : "pl-3.5"}>
                    {list.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
