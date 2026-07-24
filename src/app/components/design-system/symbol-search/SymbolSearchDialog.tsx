"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import EdgeModalShell from "../EdgeModalShell";
import EdgeSearchInput from "../EdgeSearchInput";
import type { ModalContainmentMode } from "../ModalContainmentContext";
import { useSymbolSearch } from "./useSymbolSearch";
import type { SymbolSearchMode, SymbolSearchResult } from "./types";

type Props = {
  open: boolean;
  mode: SymbolSearchMode;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSelect: (result: SymbolSearchResult) => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  testId?: string;
  inputTestId?: string;
  inputAriaLabel: string;
  inputPlaceholder?: string;
  initialQuery?: string;
  containment?: ModalContainmentMode;
};

function optionId(listboxId: string, index: number) {
  return `${listboxId}-option-${index}`;
}

export default function SymbolSearchDialog({
  open,
  mode,
  title,
  subtitle,
  onClose,
  onSelect,
  returnFocusRef,
  testId,
  inputTestId,
  inputAriaLabel,
  inputPlaceholder = "Symbol, ISIN, or CUSIP",
  initialQuery = "",
  containment,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const { results, loading, error, showingRecents } = useSymbolSearch({ query, enabled: open });

  useEffect(() => {
    if (!open) {
      setQuery(initialQuery);
      setActiveIndex(0);
      return;
    }

    // Modal focus trap focuses the input via initialFocusRef; select so typing replaces the seed.
    const selectTimer = window.setTimeout(() => {
      inputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(selectTimer);
  }, [initialQuery, open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  const handleSelect = (result: SymbolSearchResult) => {
    onSelect(result);
    setQuery("");
    setActiveIndex(0);
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Home" && results.length > 0) {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End" && results.length > 0) {
      event.preventDefault();
      setActiveIndex(results.length - 1);
      return;
    }
    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      handleSelect(results[activeIndex]!);
    }
  };

  const gridCols =
    mode === "add"
      ? "grid-cols-[minmax(120px,220px)_1fr_auto_auto_auto]"
      : "grid-cols-[minmax(120px,220px)_1fr_auto_auto]";

  const trimmedQuery = query.trim();
  const showRecentEmpty = !loading && !error && showingRecents && results.length === 0;
  const showRecentList = !loading && !error && showingRecents && results.length > 0;
  const showSearchEmpty = !loading && !error && !showingRecents && trimmedQuery && results.length === 0;

  return (
    <EdgeModalShell
      open={open}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      maxWidth="md"
      testId={testId}
      returnFocusRef={returnFocusRef}
      initialFocusRef={inputRef}
      containment={containment}
    >
      <div className="px-5 pb-3">
        <EdgeSearchInput
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={inputPlaceholder}
          aria-label={inputAriaLabel}
          aria-controls={listboxId}
          aria-activedescendant={results.length > 0 ? optionId(listboxId, activeIndex) : undefined}
          aria-autocomplete="list"
          role="combobox"
          aria-expanded={results.length > 0 || showRecentEmpty}
          data-testid={inputTestId}
          loading={loading}
          onClear={() => {
            setQuery("");
            inputRef.current?.focus();
          }}
          clearLabel="Clear symbol search"
          leadingIcon={
            <svg width={18} height={18} viewBox="0 0 18 18" fill="none" aria-hidden className="opacity-65">
              <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M12 12l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      <div
        id={listboxId}
        role="listbox"
        aria-label={title}
        className="max-h-[470px] min-h-[260px] overflow-y-auto pb-2"
      >
        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-[var(--edge-text-secondary)]">
            Searching symbols…
          </div>
        ) : null}

        {!loading && error ? (
          <div className="px-5 py-8 text-center text-sm text-[var(--edge-negative)]">{error}</div>
        ) : null}

        {showRecentEmpty ? (
          <div className="px-5 py-8 text-center text-sm text-[var(--edge-text-secondary)]">
            No recent symbols
          </div>
        ) : null}

        {showSearchEmpty ? (
          <div className="px-5 py-8 text-center text-sm text-[var(--edge-text-secondary)]">
            No symbols found
          </div>
        ) : null}

        {showRecentList ? (
          <div className="px-5 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-[var(--edge-text-muted)]">
            Recent
          </div>
        ) : null}

        {!loading &&
          !error &&
          results.map((result, index) => (
            <button
              key={`${result.symbol}-${result.exchange}`}
              id={optionId(listboxId, index)}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`edge-focus-ring grid w-full ${gridCols} items-center gap-3 border-t border-[var(--edge-border)] px-5 py-2.5 text-left text-sm ${
                activeIndex === index ? "bg-[var(--edge-surface-active)]" : ""
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[var(--edge-border-strong)] bg-[var(--edge-surface-chart)] text-[10px] font-semibold text-[var(--edge-warning)]"
                  aria-hidden
                >
                  ◆
                </span>
                <span className="truncate text-base font-medium text-[var(--edge-accent-blue)]">
                  {result.symbol}
                </span>
              </span>
              <span className="truncate">{result.name}</span>
              <span className="text-xs lowercase text-[var(--edge-text-muted)]">stock</span>
              <span className="font-medium text-[var(--edge-text-secondary)]">{result.exchange}</span>
              {mode === "add" ? (
                <span className="text-2xl font-light leading-none text-[var(--edge-text-secondary)]" aria-hidden>
                  +
                </span>
              ) : null}
            </button>
          ))}
      </div>
    </EdgeModalShell>
  );
}
