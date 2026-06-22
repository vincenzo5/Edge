"use client";

import { useMemo, useState } from "react";
import type { IndicatorConfig, Theme } from "@/lib/chartConfig";
import {
  getCatalogByCategory,
  INDICATOR_CATEGORIES,
  type CatalogEntry,
} from "@/lib/chart/indicators/registry";
import type { IndicatorCategory } from "@/lib/chart/plugin-api";
import {
  isIndicatorFavorite,
  toggleIndicatorFavorite,
} from "@/lib/chart/indicatorFavorites";

type SidebarSection =
  | "favorites"
  | "my-scripts"
  | "purchased"
  | "technicals"
  | "fundamentals"
  | "editors-picks"
  | "top"
  | "trending"
  | "store";

type Props = {
  open: boolean;
  active: IndicatorConfig[];
  theme?: Theme;
  onAdd: (indicator: Pick<IndicatorConfig, "name" | "pane">) => void;
  onClose: () => void;
};

const SIDEBAR: { id: SidebarSection; label: string; group: "personal" | "built-in" | "community"; implemented: boolean }[] = [
  { id: "favorites", label: "Favorites", group: "personal", implemented: true },
  { id: "my-scripts", label: "My scripts", group: "personal", implemented: false },
  { id: "purchased", label: "Purchased", group: "personal", implemented: false },
  { id: "technicals", label: "Technicals", group: "built-in", implemented: true },
  { id: "fundamentals", label: "Fundamentals", group: "built-in", implemented: false },
  { id: "editors-picks", label: "Editors' picks", group: "community", implemented: false },
  { id: "top", label: "Top", group: "community", implemented: false },
  { id: "trending", label: "Trending", group: "community", implemented: false },
  { id: "store", label: "Store", group: "community", implemented: false },
];

export default function IndicatorPicker({ open, active, theme = "dark", onAdd, onClose }: Props) {
  const grouped = useMemo(() => getCatalogByCategory(), []);
  const [section, setSection] = useState<SidebarSection>("technicals");
  const [query, setQuery] = useState("");
  const [favoriteRevision, setFavoriteRevision] = useState(0);
  const isDark = theme === "dark";

  if (!open) return null;

  const instanceCount = (name: string) => active.filter((a) => a.name === name).length;

  const allEntries = INDICATOR_CATEGORIES.flatMap((c) => grouped[c]);

  const filteredEntries = (() => {
    const q = query.trim().toLowerCase();
    let entries: CatalogEntry[] = allEntries;

    if (section === "favorites") {
      entries = allEntries.filter((e) => isIndicatorFavorite(e.name));
    } else if (section === "technicals") {
      entries = allEntries;
    } else {
      entries = [];
    }

    if (q) {
      entries = entries.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q),
      );
    }
    return entries;
  })();

  void favoriteRevision;

  const renderRow = (ind: CatalogEntry) => {
    const pane = ind.defaultPane;
    const count = instanceCount(ind.name);
    const starred = isIndicatorFavorite(ind.name);

    return (
      <tr
        key={ind.name}
        className={`border-b ${isDark ? "border-[#363a45]" : "border-gray-100"} ${
          !ind.implemented ? "opacity-40" : ""
        }`}
      >
        <td className="px-3 py-2">
          <button
            type="button"
            aria-label={starred ? "Remove from favorites" : "Add to favorites"}
            onClick={() => {
              toggleIndicatorFavorite(ind.name);
              setFavoriteRevision((r) => r + 1);
            }}
            className="text-sm"
          >
            {starred ? "★" : "☆"}
          </button>
        </td>
        <td className="px-3 py-2">
          {ind.implemented ? (
            <button
              type="button"
              onClick={() => onAdd({ name: ind.name, pane })}
              className={`text-left font-medium hover:underline ${isDark ? "text-[#d1d4dc]" : "text-gray-900"}`}
            >
              {ind.name}
            </button>
          ) : (
            <span className="font-medium">{ind.name}</span>
          )}
          <div className="text-xs opacity-60">{ind.description}</div>
        </td>
        <td className="px-3 py-2 text-xs text-blue-400">Edge</td>
        <td className="px-3 py-2 text-right text-xs tabular-nums">
          {count > 0 ? count : "—"}
        </td>
      </tr>
    );
  };

  const sidebarGroups = ["personal", "built-in", "community"] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={`flex h-[min(80vh,640px)] w-full max-w-4xl flex-col overflow-hidden rounded-lg border shadow-2xl ${
          isDark ? "border-[#363a45] bg-[#131722] text-[#d1d4dc]" : "border-gray-200 bg-white text-gray-900"
        }`}
        onClick={(e) => e.stopPropagation()}
        data-testid="indicator-picker-modal"
      >
        <div className="flex items-center justify-between border-b px-4 py-3 dark:border-[#363a45]">
          <h3 className="text-base font-semibold">Indicators, metrics, and strategies</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm opacity-60 hover:opacity-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="border-b px-4 py-2 dark:border-[#363a45]">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className={`w-full rounded border px-3 py-2 text-sm outline-none ${
              isDark
                ? "border-[#363a45] bg-[#1e222d] text-[#d1d4dc]"
                : "border-gray-300 bg-gray-50"
            }`}
            data-testid="indicator-search"
          />
        </div>

        <div className="flex min-h-0 flex-1">
          <aside
            className={`w-48 shrink-0 overflow-y-auto border-r p-2 dark:border-[#363a45] ${
              isDark ? "bg-[#131722]" : "bg-gray-50"
            }`}
          >
            {sidebarGroups.map((group) => (
              <div key={group} className="mb-3">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide opacity-50">
                  {group}
                </p>
                {SIDEBAR.filter((s) => s.group === group).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.implemented}
                    onClick={() => setSection(item.id)}
                    className={`mb-0.5 flex w-full items-center rounded px-2 py-1.5 text-left text-sm ${
                      section === item.id
                        ? isDark
                          ? "bg-[#2a2e39] text-[#d1d4dc]"
                          : "bg-gray-200 text-gray-900"
                        : item.implemented
                          ? isDark
                            ? "hover:bg-[#2a2e39]"
                            : "hover:bg-gray-100"
                          : "cursor-not-allowed opacity-40"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </aside>

          <div className="min-w-0 flex-1 overflow-y-auto">
            {!SIDEBAR.find((s) => s.id === section)?.implemented ? (
              <p className="px-4 py-8 text-center text-sm opacity-60">Coming soon</p>
            ) : filteredEntries.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm opacity-60">
                {section === "favorites" ? "No favorite indicators yet" : "No indicators found"}
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className={`text-left text-[10px] uppercase tracking-wide opacity-50 ${isDark ? "border-[#363a45]" : "border-gray-200"} border-b`}>
                    <th className="px-3 py-2 w-8" />
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Author</th>
                    <th className="px-3 py-2 text-right">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map(renderRow)}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
