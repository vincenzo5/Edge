"use client";

import { useEffect, useRef, useState } from "react";
import type { Theme } from "@/lib/chartConfig";

type SearchResult = {
  symbol: string;
  name: string;
  exchange: string;
};

const SYMBOL_FILTERS = ["All", "Stocks", "Funds", "Futures", "Forex", "Crypto", "Indices", "Bonds", "Economy", "Options"];

export default function SearchBar({
  onSelect,
  initial = "",
  compact = false,
  theme = "dark",
}: {
  onSelect: (result: SearchResult) => void;
  initial?: string;
  compact?: boolean;
  theme?: Theme;
}) {
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);
  const focusedRef = useRef(false);
  const isDark = theme === "dark";

  useEffect(() => {
    setQuery(initial);
  }, [initial]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    const shouldSearch = modalOpen || focusedRef.current;
    if (!trimmed || !shouldSearch) {
      if (!trimmed) {
        setResults([]);
        setOpen(false);
      }
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
        const next = body.results ?? [];
        setResults(next);
        setActiveIndex(0);
        setOpen(!compact && focusedRef.current && next.length > 0);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [compact, modalOpen, query]);

  useEffect(() => {
    if (!modalOpen) return;

    const focusTimer = window.setTimeout(() => {
      modalInputRef.current?.focus();
      modalInputRef.current?.select();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModalOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalOpen]);

  const handleSelect = (result: SearchResult) => {
    onSelect(result);
    setQuery(result.symbol);
    setResults([]);
    setOpen(false);
    setModalOpen(false);
    inputRef.current?.blur();
  };

  const openSymbolModal = () => {
    focusedRef.current = false;
    setOpen(false);
    setModalOpen(true);
  };

  const symbolInputClass = `w-full rounded px-2 py-1 text-xs font-medium outline-none ${
    compact
      ? isDark
        ? "border border-[#363a45] bg-[#2a2e39] text-[#d1d4dc] focus:border-[#787b86]"
        : "border border-gray-300 bg-gray-100 text-gray-900 focus:border-gray-400"
      : isDark
        ? "border border-gray-700 bg-transparent text-sm text-[#d1d4dc] focus:border-blue-500"
        : "border border-gray-300 bg-transparent text-sm focus:border-blue-500"
  }`;

  return (
    <div className={`relative ${compact ? "w-auto min-w-[72px]" : "w-full max-w-md"}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        readOnly={compact}
        onClick={compact ? openSymbolModal : undefined}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (compact) {
            openSymbolModal();
            return;
          }
          focusedRef.current = true;
          if (results.length > 0) setOpen(true);
        }}
        onBlur={() => {
          focusedRef.current = false;
          setTimeout(() => setOpen(false), 150);
        }}
        placeholder={compact ? "Symbol" : "Search stocks (e.g. AAPL, Apple)"}
        className={symbolInputClass}
        data-testid="symbol-search-input"
      />
      {!compact && loading && (
        <div className="absolute right-2 top-1.5 text-xs text-gray-400">…</div>
      )}
      {open && results.length > 0 && (
        <ul
          className={`absolute z-20 mt-1 max-h-72 min-w-full overflow-auto rounded border py-1 shadow-lg ${
            isDark
              ? "border-[#363a45] bg-[#1e222d] text-[#d1d4dc]"
              : "border-gray-200 bg-white text-gray-900"
          }`}
        >
          {results.map((r) => (
            <li key={r.symbol}>
              <button
                type="button"
                onMouseDown={() => handleSelect(r)}
                className={`flex w-full items-center justify-between px-2 py-1.5 text-left text-sm ${
                  isDark ? "hover:bg-[#2a2e39]" : "hover:bg-gray-100"
                }`}
              >
                <span className="font-medium">{r.symbol}</span>
                <span className="ml-2 truncate opacity-60">
                  {r.name}
                  {r.exchange ? ` · ${r.exchange}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {compact && modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/45 px-5 pt-[9vh]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModalOpen(false);
              inputRef.current?.blur();
            }
          }}
          data-testid="symbol-search-modal"
        >
          <div
            className={`w-full max-w-[840px] overflow-hidden rounded-md shadow-2xl ${
              isDark
                ? "border border-[#3a3d45] bg-[#1f1f1f] text-[#d1d4dc]"
                : "border border-gray-200 bg-white text-gray-900"
            }`}
            role="dialog"
            aria-label="Symbol search"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-xl font-semibold tracking-[-0.01em]">Symbol search</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className={`rounded p-1 text-2xl leading-none ${
                  isDark ? "text-[#c7c9d1] hover:bg-[#2a2e39]" : "text-gray-500 hover:bg-gray-100"
                }`}
                aria-label="Close symbol search"
              >
                ×
              </button>
            </div>

            <div className="px-5">
              <div
                className={`flex h-10 items-center gap-2 rounded-md border px-3 ${
                  isDark ? "border-[#4b4f58] bg-[#222]" : "border-gray-300 bg-white"
                }`}
              >
                <svg width={18} height={18} viewBox="0 0 18 18" fill="none" aria-hidden className="opacity-65">
                  <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M12 12l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <input
                  ref={modalInputRef}
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
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
                  data-testid="symbol-search-modal-input"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      modalInputRef.current?.focus();
                    }}
                    className={`rounded-full px-1.5 py-0.5 text-sm ${
                      isDark ? "bg-[#4b4f58] text-[#d1d4dc]" : "bg-gray-200 text-gray-700"
                    }`}
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
                      ? isDark
                        ? "bg-[#f1f3f6] text-[#111]"
                        : "bg-gray-900 text-white"
                      : isDark
                        ? "bg-[#2b2b2b] text-[#cfd2dc]"
                        : "bg-gray-100 text-gray-700"
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
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`grid w-full grid-cols-[minmax(120px,220px)_1fr_auto_auto] items-center gap-3 border-t px-5 py-2.5 text-left text-sm ${
                      isDark ? "border-[#303030]" : "border-gray-100"
                    } ${
                      activeIndex === index
                        ? isDark
                          ? "bg-[#292929] outline outline-2 outline-white"
                          : "bg-gray-50 outline outline-2 outline-gray-900"
                        : ""
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold ${
                          isDark ? "border-[#4b4f58] bg-[#111] text-[#ff9f43]" : "border-gray-300 bg-gray-50 text-orange-500"
                        }`}
                        aria-hidden
                      >
                        ◆
                      </span>
                      <span className="truncate text-base font-medium text-[#2962ff]">{result.symbol}</span>
                    </span>
                    <span className="truncate">{result.name}</span>
                    <span className="text-xs lowercase opacity-50">stock</span>
                    <span className="font-medium opacity-80">{result.exchange}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
