"use client";

import {
  LAYOUT_MENU_ROWS,
  templatesForPaneCount,
  cellCountFor,
  type LayoutTemplateId,
  type Theme,
} from "@/lib/chartConfig";

type Props = {
  layoutId: LayoutTemplateId;
  theme: Theme;
  linkSymbol: boolean;
  activeCellIndex: number;
  onLayoutChange: (layoutId: LayoutTemplateId) => void;
  onThemeChange: (theme: Theme) => void;
  onLinkSymbolChange: (linkSymbol: boolean) => void;
  onReset: () => void;
};

export default function Toolbar({
  layoutId,
  theme,
  linkSymbol,
  activeCellIndex,
  onLayoutChange,
  onThemeChange,
  onLinkSymbolChange,
  onReset,
}: Props) {
  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-800">
      <h1 className="mr-2 text-lg font-bold">Stock Charts</h1>

      <div className="flex items-center gap-1">
        <span className="text-xs opacity-60">Layout</span>
        <select
          value={layoutId}
          onChange={(e) => onLayoutChange(e.target.value as LayoutTemplateId)}
          className="rounded border border-gray-300 bg-transparent px-1 py-1 text-xs dark:border-gray-700"
        >
          {LAYOUT_MENU_ROWS.flatMap((paneCount) =>
            templatesForPaneCount(paneCount).map((t) => (
              <option key={t.id} value={t.id}>
                {paneCount} — {t.id}
              </option>
            )),
          )}
        </select>
      </div>

      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={linkSymbol}
          onChange={(e) => onLinkSymbolChange(e.target.checked)}
        />
        Link symbols
      </label>

      {cellCountFor(layoutId) > 1 && (
        <span className="text-xs opacity-60">
          Cell {activeCellIndex + 1}/{cellCountFor(layoutId)}
        </span>
      )}

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
        className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        {theme === "dark" ? "Light" : "Dark"}
      </button>

      <button
        type="button"
        onClick={onReset}
        className="rounded border border-gray-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-900/20"
      >
        Reset
      </button>
    </header>
  );
}
