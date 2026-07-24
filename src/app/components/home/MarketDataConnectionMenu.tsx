"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import EdgeBorderLabeledControl from "../design-system/EdgeBorderLabeledControl";
import { bodyTextClass, headerChipClass } from "../design-system/styles";
import { resolveConnectionDisplayName, useConnectionsList } from "@/lib/connections";
import {
  type DataConnectionId,
} from "@/lib/marketData/dataConnectionPreference";
import { useDataConnectionPreference } from "@/lib/marketData/useDataConnectionPreference";

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function MarketDataConnectionMenu({
  open: openProp,
  onOpenChange,
}: Props = {}) {
  const { preference, setPreference } = useDataConnectionPreference();
  const { connections } = useConnectionsList();
  const [internalOpen, setInternalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const setOpen = useCallback(
    (next: boolean | ((value: boolean) => boolean)) => {
      const resolved = typeof next === "function" ? next(open) : next;
      if (isControlled) {
        onOpenChange?.(resolved);
      } else {
        setInternalOpen(resolved);
      }
    },
    [isControlled, onOpenChange, open],
  );

  const close = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  const handleSelect = (connectionId: DataConnectionId) => {
    setPreference(connectionId);
    close();
  };

  const preferenceLabel = resolveConnectionDisplayName(preference, connections);

  return (
    <div ref={containerRef} className="relative">
      <EdgeBorderLabeledControl label="Data" labelId={labelId} labelSurface="toolbar">
        <button
          type="button"
          id="app-market-data-picker"
          data-testid="app-market-data-picker"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={labelId}
          title="Market data connection for charts and watchlists. Does not change the trading account."
          className={`edge-focus-ring ${headerChipClass()} max-w-[11rem] border-[var(--edge-border-subtle)] bg-transparent`}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="min-w-0 flex-1 truncate text-left">{preferenceLabel}</span>
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

      {open ? (
        <div
          data-testid="app-market-data-picker-menu"
          className="edge-popover absolute right-0 top-full z-50 mt-1 min-w-[12rem] overflow-hidden rounded border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] py-1 shadow-lg"
          role="listbox"
          aria-label="Market data connection"
        >
          {connections.map((connection) => {
            const selected = connection.id === preference;
            return (
              <button
                key={connection.id}
                type="button"
                role="option"
                aria-selected={selected}
                data-testid={`app-market-data-option-${connection.id}`}
                className={`edge-focus-ring flex w-full min-h-[var(--edge-control-height-compact)] items-center px-[var(--edge-space-3)] text-left ${bodyTextClass()} hover:bg-[var(--edge-surface-hover)] ${
                  selected
                    ? "bg-[var(--edge-surface-active)] text-[var(--edge-text-strong)]"
                    : "text-[var(--edge-text-primary)]"
                }`}
                onClick={() => handleSelect(connection.id as DataConnectionId)}
              >
                {connection.displayName}
              </button>
            );
          })}
          <p
            className={`px-[var(--edge-space-3)] py-2 ${bodyTextClass()} text-[var(--edge-text-muted)]`}
          >
            Affects chart and watchlist data only
          </p>
        </div>
      ) : null}
    </div>
  );
}
