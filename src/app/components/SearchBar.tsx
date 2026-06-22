"use client";

import { useEffect, useRef, useState } from "react";
import type { Theme } from "@/lib/chartConfig";

type SearchResult = {
  symbol: string;
  name: string;
  exchange: string;
};

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
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusedRef = useRef(false);
  const isDark = theme === "dark";

  useEffect(() => {
    setQuery(initial);
  }, [initial]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed || !focusedRef.current) {
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
        setOpen(focusedRef.current && next.length > 0);
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
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    onSelect(result);
    setQuery(result.symbol);
    setResults([]);
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className={`relative ${compact ? "w-auto min-w-[72px]" : "w-full max-w-md"}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          focusedRef.current = true;
          if (results.length > 0) setOpen(true);
        }}
        onBlur={() => {
          focusedRef.current = false;
          setTimeout(() => setOpen(false), 150);
        }}
        placeholder={compact ? "Symbol" : "Search stocks (e.g. AAPL, Apple)"}
        className={`w-full rounded px-2 py-1 text-xs font-medium outline-none ${
          compact
            ? isDark
              ? "border border-[#363a45] bg-[#2a2e39] text-[#d1d4dc] focus:border-[#787b86]"
              : "border border-gray-300 bg-gray-100 text-gray-900 focus:border-gray-400"
            : isDark
              ? "border border-gray-700 bg-transparent text-sm text-[#d1d4dc] focus:border-blue-500"
              : "border border-gray-300 bg-transparent text-sm focus:border-blue-500"
        }`}
        data-testid="symbol-search-input"
      />
      {loading && (
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
    </div>
  );
}
