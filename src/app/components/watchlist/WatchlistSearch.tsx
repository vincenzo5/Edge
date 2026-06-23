"use client";

import { useEffect, useRef, useState } from "react";
import type { SymbolSelectResult } from "@/lib/watchlist/types";

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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/45 px-5 pt-[9vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      data-testid="watchlist-add-symbol-modal"
    >
      <div
        className="w-full max-w-[840px] overflow-hidden rounded-md border border-[#3a3d45] bg-[#1f1f1f] text-[#d1d4dc] shadow-2xl"
        role="dialog"
        aria-label={`Add symbol to ${activeListName}`}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.01em]">Add symbol</h2>
            <p className="mt-0.5 text-xs text-[#8b8fa3]">Add to {activeListName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-2xl leading-none text-[#c7c9d1] hover:bg-[#2a2e39]"
            aria-label="Close add symbol"
          >
            ×
          </button>
        </div>

        <div className="px-5">
          <div className="flex h-10 items-center gap-2 rounded-md border border-[#4b4f58] bg-[#222] px-3">
            <svg width={18} height={18} viewBox="0 0 18 18" fill="none" aria-hidden className="opacity-65">
              <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M12 12l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              type="text"
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
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[#6f7380]"
              aria-label="Search symbols to add"
              data-testid="watchlist-add-symbol-input"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="rounded-full bg-[#4b4f58] px-1.5 py-0.5 text-sm text-[#d1d4dc]"
                aria-label="Clear symbol search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto px-5 py-3">
          {SYMBOL_FILTERS.map((filter, index) => (
            <button
              key={filter}
              type="button"
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                index === 0
                  ? "bg-[#f1f3f6] text-[#111]"
                  : "bg-[#2b2b2b] text-[#cfd2dc]"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="max-h-[470px] min-h-[260px] overflow-y-auto pb-2">
          {loading && (
            <div className="px-5 py-8 text-center text-sm opacity-60">Searching symbols…</div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="px-5 py-8 text-center text-sm opacity-60">No symbols found</div>
          )}

          {!loading &&
            results.map((result, index) => (
              <button
                key={`${result.symbol}-${result.exchange}`}
                type="button"
                role="option"
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`grid w-full grid-cols-[minmax(120px,220px)_1fr_auto_auto_auto] items-center gap-3 border-t border-[#303030] px-5 py-2.5 text-left text-sm ${
                  activeIndex === index ? "bg-[#292929] outline outline-2 outline-white" : ""
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#4b4f58] bg-[#111] text-[10px] font-semibold text-[#ff9f43]"
                    aria-hidden
                  >
                    ◆
                  </span>
                  <span className="truncate text-base font-medium text-[#2962ff]">{result.symbol}</span>
                </span>
                <span className="truncate">{result.name}</span>
                <span className="text-xs lowercase opacity-50">stock</span>
                <span className="font-medium opacity-80">{result.exchange}</span>
                <span className="text-2xl font-light leading-none opacity-80" aria-hidden>
                  +
                </span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
