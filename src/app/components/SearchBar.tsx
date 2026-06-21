"use client";

import { useEffect, useRef, useState } from "react";

type SearchResult = {
  symbol: string;
  name: string;
  exchange: string;
};

export default function SearchBar({
  onSelect,
  initial = "",
  compact = false,
}: {
  onSelect: (result: SearchResult) => void;
  initial?: string;
  compact?: boolean;
}) {
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusedRef = useRef(false);

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
    <div className={`relative ${compact ? "w-32" : "w-full max-w-md"}`}>
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
        className="w-full rounded border border-gray-300 bg-transparent px-2 py-1 text-sm outline-none focus:border-blue-500 dark:border-gray-700"
      />
      {loading && (
        <div className="absolute right-2 top-1.5 text-xs text-gray-400">…</div>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
          {results.map((r) => (
            <li key={r.symbol}>
              <button
                type="button"
                onMouseDown={() => handleSelect(r)}
                className="flex w-full items-center justify-between px-2 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
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
