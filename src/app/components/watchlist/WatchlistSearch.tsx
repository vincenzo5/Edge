"use client";

import { useEffect, useRef, useState } from "react";
import type { SymbolSelectResult } from "@/lib/watchlist/types";
import { EdgeModalShell, EdgeSearchInput, chipClass } from "../design-system";

type SearchResult = SymbolSelectResult;

const SYMBOL_FILTERS = [
  "All",
  "Stocks",
  "Funds",
  "Futures",
  "Forex",
  "Crypto",
  "Indices",
  "Bonds",
  "Economy",
  "Options",
];

export default function WatchlistSearch({
  open,
  activeListName,
  onAdd,
  onClose,
}: {
  open: boolean;
  activeListName: string;
  onAdd: (result: SearchResult) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setActiveIndex(0);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
        });
        const body = await res.json();
        const next = (body.results ?? []) as SearchResult[];
        setResults(next);
        setActiveIndex(0);
      } catch {
        setResults([]);
        setActiveIndex(0);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, query]);

  const handleSelect = (result: SearchResult) => {
    onAdd(result);
    setQuery("");
    setResults([]);
    setActiveIndex(0);
    onClose();
  };

  return (
    <EdgeModalShell
      open={open}
      title="Add symbol"
      subtitle={`Add to ${activeListName}`}
      onClose={onClose}
      maxWidth="md"
      testId="watchlist-add-symbol-modal"
    >
      <div className="px-5 pb-3">
        <EdgeSearchInput
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && results[activeIndex]) {
              handleSelect(results[activeIndex]);
            }
          }}
          placeholder="Symbol, ISIN, or CUSIP"
          aria-label="Search symbols to add"
          data-testid="watchlist-add-symbol-input"
          leadingIcon={
            <svg width={18} height={18} viewBox="0 0 18 18" fill="none" aria-hidden className="opacity-65">
              <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M12 12l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          }
          trailing={
            query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="rounded-full bg-[var(--edge-surface-active)] px-1.5 py-0.5 text-sm text-[var(--edge-text-primary)]"
                aria-label="Clear symbol search"
              >
                ×
              </button>
            ) : null
          }
        />
      </div>

      <div className="flex gap-1 overflow-x-auto px-5 pb-3">
        {SYMBOL_FILTERS.map((filter, index) => (
          <button
            key={filter}
            type="button"
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${chipClass(index === 0)}`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="max-h-[470px] min-h-[260px] overflow-y-auto pb-2">
        {loading && (
          <div className="px-5 py-8 text-center text-sm text-[var(--edge-text-secondary)]">
            Searching symbols…
          </div>
        )}

        {!loading && query.trim() && results.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-[var(--edge-text-secondary)]">
            No symbols found
          </div>
        )}

        {!loading &&
          results.map((result, index) => (
            <button
              key={`${result.symbol}-${result.exchange}`}
              type="button"
              role="option"
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`edge-focus-ring grid w-full grid-cols-[minmax(120px,220px)_1fr_auto_auto_auto] items-center gap-3 border-t border-[var(--edge-border)] px-5 py-2.5 text-left text-sm ${
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
              <span className="text-2xl font-light leading-none text-[var(--edge-text-secondary)]" aria-hidden>
                +
              </span>
            </button>
          ))}
      </div>
    </EdgeModalShell>
  );
}
