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
import { EdgeModalShell, EdgeSearchInput, segmentedTabClass } from "./design-system";

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

const SIDEBAR: {
  id: SidebarSection;
  label: string;
  group: "personal" | "built-in" | "community";
  implemented: boolean;
}[] = [
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
  void theme;
  const grouped = useMemo(() => getCatalogByCategory(), []);
  const [section, setSection] = useState<SidebarSection>("technicals");
  const [query, setQuery] = useState("");
  const [favoriteRevision, setFavoriteRevision] = useState(0);

  const instanceCount = (name: string) => active.filter((a) => a.name === name).length;

  const allEntries = INDICATOR_CATEGORIES.flatMap((c) => grouped[c as IndicatorCategory]);

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
        className={`border-b border-[var(--edge-border)] ${!ind.implemented ? "opacity-40" : ""}`}
      >
        <td className="px-3 py-2">
          <button
            type="button"
            aria-label={starred ? "Remove from favorites" : "Add to favorites"}
            onClick={() => {
              toggleIndicatorFavorite(ind.name);
              setFavoriteRevision((r) => r + 1);
            }}
            className="text-sm text-[var(--edge-text-secondary)]"
          >
            {starred ? "★" : "☆"}
          </button>
        </td>
        <td className="px-3 py-2">
          {ind.implemented ? (
            <button
              type="button"
              onClick={() => onAdd({ name: ind.name, pane })}
              className="text-left font-medium text-[var(--edge-text-primary)] hover:underline"
            >
              {ind.name}
            </button>
          ) : (
            <span className="font-medium text-[var(--edge-text-primary)]">{ind.name}</span>
          )}
          <div className="text-xs text-[var(--edge-text-muted)]">{ind.description}</div>
        </td>
        <td className="px-3 py-2 text-xs text-[var(--edge-accent-blue)]">Edge</td>
        <td className="px-3 py-2 text-right text-xs tabular-nums text-[var(--edge-text-secondary)]">
          {count > 0 ? count : "—"}
        </td>
      </tr>
    );
  };

  const sidebarGroups = ["personal", "built-in", "community"] as const;

  return (
    <EdgeModalShell
      open={open}
      title="Indicators, metrics, and strategies"
      onClose={onClose}
      maxWidth="lg"
      align="center"
      testId="indicator-picker-modal"
    >
      <div className="border-b border-[var(--edge-border)] px-4 py-2">
        <EdgeSearchInput
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          data-testid="indicator-search"
        />
      </div>

      <div className="flex min-h-0 max-h-[min(60vh,520px)] flex-1 flex-col sm:flex-row">
        <aside className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] p-2 sm:w-48 sm:flex-col sm:overflow-x-visible sm:overflow-y-auto sm:border-b-0 sm:border-r">
          {sidebarGroups.map((group) => (
            <div key={group} className="mb-3">
              <p className="edge-section-header mb-1 px-2">{group}</p>
              {SIDEBAR.filter((s) => s.group === group).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={!item.implemented}
                  onClick={() => setSection(item.id)}
                  className={`edge-focus-ring mb-0.5 flex w-full items-center px-2 py-1.5 text-left text-sm transition-colors ${segmentedTabClass(section === item.id)} ${
                    item.implemented ? "" : "cursor-not-allowed opacity-40"
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
            <p className="px-4 py-8 text-center text-sm text-[var(--edge-text-secondary)]">Coming soon</p>
          ) : filteredEntries.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--edge-text-secondary)]">
              {section === "favorites" ? "No favorite indicators yet" : "No indicators found"}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--edge-border)] text-left text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]">
                  <th className="w-8 px-3 py-2" />
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Author</th>
                  <th className="px-3 py-2 text-right">Active</th>
                </tr>
              </thead>
              <tbody>{filteredEntries.map(renderRow)}</tbody>
            </table>
          )}
        </div>
      </div>
    </EdgeModalShell>
  );
}
