"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EdgeModalShell, EdgeSearchInput } from "../design-system";
import { useAppActions } from "../AppActionsContext";
import { useActiveChart } from "../ActiveChartContext";
import { useAppThemeOptional } from "../AppThemeProvider";
import { useChartActions } from "../ChartActionsContext";
import {
  buildPaletteCommands,
  findCommandById,
} from "./buildShortcutCommands";
import { useShortcutUI } from "./ShortcutUIContext";
import {
  filterCommandsByQuery,
  getCommandLabel,
  allCatalogCommandIds,
} from "@/lib/shortcuts/commandCatalog";
import { getShortcutLabel } from "@/lib/shortcuts/formatShortcutLabel";
import { QUICK_GUIDE_GROUPS } from "@/lib/shortcuts/quickGuide";
import {
  pushRecentCommand,
  readRecentCommands,
  subscribeRecentCommands,
} from "@/lib/shortcuts/recentCommands";
import type { ShortcutCommand, ShortcutId } from "@/lib/shortcuts/shortcutTypes";
import { SymbolSearchDialog } from "../design-system/symbol-search";
import type { SymbolSearchResult } from "../design-system/symbol-search/types";

function SearchIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden className="opacity-50">
      <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

type PaletteRow = {
  id: ShortcutId;
  command: ShortcutCommand | null;
  disabled: boolean;
};

type PaletteSection = {
  label: string;
  rows: PaletteRow[];
};

function buildRows(ids: ShortcutId[], commands: ShortcutCommand[]): PaletteRow[] {
  return ids.map((id) => {
    const command = findCommandById(commands, id) ?? null;
    const disabled = command ? (command.enabled ? !command.enabled() : false) : true;
    return { id, command, disabled };
  });
}

function CommandRow({
  row,
  active,
  onSelect,
}: {
  row: PaletteRow;
  active: boolean;
  onSelect: () => void;
}) {
  const label = getCommandLabel(row.id);
  const shortcut = getShortcutLabel(row.id);

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      disabled={row.disabled}
      data-testid={`command-palette-item-${row.id}`}
      className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors ${
        active
          ? "bg-[var(--edge-surface-hover)] text-[var(--edge-text-primary)]"
          : "text-[var(--edge-text-primary)]"
      } ${row.disabled ? "cursor-not-allowed opacity-40" : "hover:bg-[var(--edge-surface-hover)]"}`}
      onMouseDown={(event) => {
        event.preventDefault();
        if (!row.disabled) onSelect();
      }}
    >
      <span>{label}</span>
      {shortcut ? (
        <span className="shrink-0 text-xs text-[var(--edge-text-muted)]">{shortcut}</span>
      ) : null}
    </button>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--edge-text-muted)]">
      {children}
    </div>
  );
}

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const appActions = useAppActions();
  const activeChart = useActiveChart();
  const {
    getCommandPalette,
    getSymbolSearch,
    getThemeToggle,
    getOpenPositionsMenu,
    getOpenPositionsAvailability,
    registrationVersion,
  } = useShortcutUI();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<ShortcutId[]>(() => readRecentCommands());
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo(
    () =>
      buildPaletteCommands({
        appActions,
        activeChart,
        commandPalette: getCommandPalette(),
        symbolSearch: getSymbolSearch(),
        toggleTheme: getThemeToggle(),
        openPositionsMenu: getOpenPositionsMenu(),
        hasOpenPositions: getOpenPositionsAvailability(),
      }),
    [
      appActions,
      activeChart,
      getCommandPalette,
      getSymbolSearch,
      getThemeToggle,
      getOpenPositionsMenu,
      getOpenPositionsAvailability,
      registrationVersion,
    ],
  );

  const filteredIds = useMemo(() => {
    const runnableIds = allCatalogCommandIds().filter((id) => findCommandById(commands, id));
    return filterCommandsByQuery(runnableIds, query);
  }, [commands, query]);

  const emptySections = useMemo((): PaletteSection[] => {
    const recentSet = new Set(recentIds);
    const sections: PaletteSection[] = [];

    const recentRunnable = recentIds.filter((id) => findCommandById(commands, id));
    if (recentRunnable.length > 0) {
      sections.push({ label: "Recent", rows: buildRows(recentRunnable, commands) });
    }

    for (const group of QUICK_GUIDE_GROUPS) {
      const ids = group.commandIds.filter(
        (id) => findCommandById(commands, id) && !recentSet.has(id),
      );
      if (ids.length === 0) continue;
      sections.push({ label: group.label, rows: buildRows(ids, commands) });
    }

    return sections;
  }, [commands, recentIds]);

  const flatRows = useMemo(() => {
    if (query.trim()) {
      return buildRows(filteredIds, commands);
    }
    return emptySections.flatMap((section) => section.rows);
  }, [commands, emptySections, filteredIds, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    return subscribeRecentCommands(setRecentIds);
  }, []);

  const runCommand = useCallback(
    async (row: PaletteRow) => {
      if (row.disabled || !row.command) return;
      onClose();
      await row.command.run();
      pushRecentCommand(row.id);
    },
    [onClose],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(flatRows.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter" && flatRows[activeIndex]) {
      event.preventDefault();
      void runCommand(flatRows[activeIndex]!);
    }
  };

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const activeEl = list.querySelector('[aria-selected="true"]');
    if (activeEl && typeof activeEl.scrollIntoView === "function") {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, flatRows.length]);

  let rowOffset = 0;

  return (
    <EdgeModalShell
      open={open}
      title="Commands"
      subtitle="Search or pick a command"
      onClose={onClose}
      maxWidth="sm"
      align="top"
      containment="viewport"
      testId="command-palette-modal"
    >
      <div className="border-b border-[var(--edge-border)] px-4 py-2">
        <EdgeSearchInput
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Search commands"
          placeholder="Search commands…"
          leadingIcon={<SearchIcon />}
          onClear={() => setQuery("")}
          data-testid="command-palette-input"
        />
      </div>
      <div
        ref={listRef}
        role="listbox"
        aria-label="Command results"
        className="max-h-[min(60vh,420px)] overflow-y-auto py-1"
        data-testid="command-palette-list"
      >
        {query.trim() ? (
          flatRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--edge-text-secondary)]">
              No matching commands
            </div>
          ) : (
            flatRows.map((row, index) => (
              <CommandRow
                key={row.id}
                row={row}
                active={index === activeIndex}
                onSelect={() => void runCommand(row)}
              />
            ))
          )
        ) : (
          emptySections.map((section) => {
            const sectionStart = rowOffset;
            const nodes = section.rows.map((row, index) => {
              const globalIndex = sectionStart + index;
              return (
                <CommandRow
                  key={`${section.label}-${row.id}`}
                  row={row}
                  active={globalIndex === activeIndex}
                  onSelect={() => void runCommand(row)}
                />
              );
            });
            rowOffset += section.rows.length;
            return (
              <div key={section.label}>
                <SectionLabel>{section.label}</SectionLabel>
                {nodes}
              </div>
            );
          })
        )}
      </div>
      <div className="border-t border-[var(--edge-border)] px-4 py-2 text-xs text-[var(--edge-text-muted)]">
        ↑↓ navigate · Enter run · Esc close
      </div>
    </EdgeModalShell>
  );
}

export default function ShortcutOverlaysHost() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [symbolOpen, setSymbolOpen] = useState(false);
  const paletteOpenRef = useRef(false);
  const symbolOpenRef = useRef(false);
  paletteOpenRef.current = paletteOpen;
  symbolOpenRef.current = symbolOpen;
  const chartActions = useChartActions();
  const appTheme = useAppThemeOptional();
  const {
    registerCommandPalette,
    registerSymbolSearch,
    registerThemeToggle,
  } = useShortcutUI();

  useEffect(() => {
    registerCommandPalette({
      open: () => setPaletteOpen(true),
      close: () => setPaletteOpen(false),
      isOpen: () => paletteOpenRef.current,
    });
    return () => registerCommandPalette(null);
  }, [registerCommandPalette]);

  useEffect(() => {
    registerSymbolSearch({
      open: () => setSymbolOpen(true),
      close: () => setSymbolOpen(false),
      isOpen: () => symbolOpenRef.current,
    });
    return () => registerSymbolSearch(null);
  }, [registerSymbolSearch]);

  useEffect(() => {
    registerThemeToggle(appTheme?.toggleTheme ?? null);
    return () => registerThemeToggle(null);
  }, [appTheme?.toggleTheme, registerThemeToggle]);

  const handleSymbolSelect = (result: SymbolSearchResult) => {
    chartActions?.loadSymbolIntoActiveChart({
      symbol: result.symbol,
      name: result.name,
      exchange: result.exchange,
    });
    setSymbolOpen(false);
  };

  return (
    <>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <SymbolSearchDialog
        open={symbolOpen}
        mode="select"
        title="Change symbol"
        onClose={() => setSymbolOpen(false)}
        onSelect={handleSymbolSelect}
        testId="command-symbol-search-modal"
        inputTestId="command-symbol-search-input"
        inputAriaLabel="Search symbol"
        containment="viewport"
      />
    </>
  );
}
