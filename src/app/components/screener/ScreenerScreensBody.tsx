"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { patchScreenerState } from "@/lib/screener";
import { resolveScreenName } from "@/lib/screener/summarizeScreen";
import { useScreenerSessionModel } from "@/lib/screener/useScreenerSessionModel";
import { SCREENER_NARROW_LAYOUT_THRESHOLD } from "@/lib/responsive/layoutConstants";
import { EdgeButton } from "../design-system";
import { useSidebarPanelWidth } from "../sidebar/SidebarPanelWidthContext";
import QueryBuilder from "./QueryBuilder";
import FilterChipSummary from "./FilterChipSummary";

export type ScreenerScreensVariant = "app" | "sidebar" | "modal" | "floating";

const SCREEN_LIMIT_OPTIONS = [50, 100, 200, 500] as const;

/** Expand-in-place save control for the Screens rail (Option B). */
export function ScreenerSaveControls({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const { handleSaveScreen } = useScreenerSessionModel(active);

  if (!open) {
    return (
      <EdgeButton
        type="button"
        variant="secondary"
        data-testid="screener-save-open"
        className="w-full justify-center px-2 py-1"
        onClick={() => setOpen(true)}
      >
        + Save current
      </EdgeButton>
    );
  }

  return (
    <div className="space-y-1.5" data-testid="screener-save-form">
      <input
        type="text"
        value={saveName}
        onChange={(event) => setSaveName(event.target.value)}
        placeholder="Screen name"
        autoFocus
        className="edge-focus-ring w-full rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1 text-xs"
        data-testid="screener-save-name"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setSaveName("");
          }
          if (event.key === "Enter" && saveName.trim()) {
            if (handleSaveScreen(saveName)) {
              setSaveName("");
              setOpen(false);
            }
          }
        }}
      />
      <div className="flex items-center gap-1">
        <EdgeButton
          type="button"
          variant="secondary"
          data-testid="screener-save-button"
          className="flex-1 justify-center px-2 py-1"
          onClick={() => {
            if (handleSaveScreen(saveName)) {
              setSaveName("");
              setOpen(false);
            }
          }}
          disabled={!saveName.trim()}
        >
          Save
        </EdgeButton>
        <EdgeButton
          type="button"
          data-testid="screener-save-cancel"
          className="px-2 py-1"
          onClick={() => {
            setOpen(false);
            setSaveName("");
          }}
        >
          Cancel
        </EdgeButton>
      </div>
    </div>
  );
}

type Props = {
  active: boolean;
  variant: ScreenerScreensVariant;
  onRunSuccess?: () => void;
  resultsSlot?: ReactNode;
  layoutRootRef?: RefObject<HTMLDivElement | null>;
};

export function ScreenerScreensBody({
  active,
  variant,
  onRunSuccess,
  resultsSlot,
  layoutRootRef,
}: Props) {
  const sidebarWidthCtx = useSidebarPanelWidth();
  const internalLayoutRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(9999);
  const runRequestedRef = useRef(false);

  const {
    state,
    setState,
    loading,
    error,
    queryRoot,
    setQueryRoot,
    limit,
    runCustomQuery,
    handleLoadSavedScreen,
    handleDeleteSavedScreen,
    hasRun,
    filterViewMode,
    setFilterViewMode,
    rows,
  } = useScreenerSessionModel(active);

  const activeName = resolveScreenName(state);
  const resolvedLayoutRef = layoutRootRef ?? internalLayoutRef;

  useEffect(() => {
    const el = resolvedLayoutRef.current;
    if (!el || variant === "sidebar") return;
    const observer = new ResizeObserver(([entry]) => {
      setMeasuredWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [variant, resolvedLayoutRef]);

  const panelWidth =
    variant === "sidebar"
      ? (sidebarWidthCtx?.panelWidth ?? SCREENER_NARROW_LAYOUT_THRESHOLD)
      : measuredWidth;
  const isNarrow = panelWidth < SCREENER_NARROW_LAYOUT_THRESHOLD;

  const showQueryEditor = !hasRun || filterViewMode === "edit";
  const showFilterSummary = hasRun && filterViewMode === "scan" && rows.length > 0;
  /** App/modal put Run in the chrome header; sidebar/floating keep it in the query row. */
  const runInChrome = variant === "app" || variant === "modal";

  const requestRun = useCallback(() => {
    runRequestedRef.current = true;
  }, []);

  const handleRunCustomQuery = useCallback(() => {
    requestRun();
    void runCustomQuery();
  }, [requestRun, runCustomQuery]);

  const handleLoadScreen = useCallback(
    (screenId: string) => {
      requestRun();
      void handleLoadSavedScreen(screenId);
    },
    [requestRun, handleLoadSavedScreen],
  );

  useEffect(() => {
    if (!runRequestedRef.current || !onRunSuccess) return;
    if (!loading && hasRun && !error) {
      runRequestedRef.current = false;
      onRunSuccess();
    }
    if (!loading && error) {
      runRequestedRef.current = false;
    }
  }, [loading, hasRun, error, onRunSuccess]);

  const handleEditFilters = useCallback(() => {
    setFilterViewMode("edit");
  }, [setFilterViewMode]);

  const limitOptions = SCREEN_LIMIT_OPTIONS.includes(
    limit as (typeof SCREEN_LIMIT_OPTIONS)[number],
  )
    ? SCREEN_LIMIT_OPTIONS
    : [...SCREEN_LIMIT_OPTIONS, limit].sort((a, b) => a - b);

  const limitControl = (
    <label className="inline-flex items-center">
      <span className="sr-only">Result limit</span>
      <select
        value={limit}
        onChange={(event) =>
          setState((prev) =>
            patchScreenerState(prev, {
              query: { ...prev.query, limit: Number(event.target.value) || 200 },
            }),
          )
        }
        className="edge-focus-ring rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1.5 text-xs text-[var(--edge-text-primary)]"
        data-testid="screener-limit-select"
        aria-label="Result limit"
      >
        {limitOptions.map((option) => (
          <option key={option} value={option}>
            Top {option}
          </option>
        ))}
      </select>
    </label>
  );

  const runControls = (
    <div className="flex flex-wrap items-center gap-2" data-testid="screener-run-controls">
      {limitControl}
      <EdgeButton
        type="button"
        variant="primary"
        data-testid="screener-run-button"
        onClick={handleRunCustomQuery}
        disabled={loading}
      >
        <span className="inline-flex items-center gap-1.5">
          {loading ? (
            <span
              className="h-3 w-3 animate-spin rounded-full border border-[var(--edge-border)] border-t-[var(--edge-text-strong)]"
              aria-hidden
            />
          ) : (
            <span aria-hidden>▶</span>
          )}
          <span>{loading ? "Running…" : "Run"}</span>
        </span>
      </EdgeButton>
      <span
        className="text-[10px] text-[var(--edge-text-muted)]"
        data-testid="screener-run-shortcut-hint"
      >
        ⌘↵
      </span>
    </div>
  );

  const screensAsideWidth =
    variant === "sidebar" ? "lg:w-36" : "w-40";

  const screensAside = (
    <aside
      className={
        variant === "app"
          ? `${screensAsideWidth} flex shrink-0 flex-col self-stretch overflow-hidden border-r border-[var(--edge-border)]`
          : variant === "modal"
            ? `${screensAsideWidth} flex shrink-0 flex-col self-stretch overflow-hidden border-r border-[var(--edge-border)]`
            : variant === "floating"
              ? isNarrow
                ? "hidden"
                : `${screensAsideWidth} flex shrink-0 flex-col self-stretch overflow-hidden border-r border-[var(--edge-border)]`
              : isNarrow
                ? "hidden"
                : `flex shrink-0 flex-col self-stretch overflow-hidden border-b border-[var(--edge-border)] lg:w-36 lg:border-b-0 lg:border-r`
      }
      data-testid="screener-screens-aside"
    >
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-2">
        <h3 className="mb-2 text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
          Screens
        </h3>
        {state.savedScreens.length === 0 ? (
          <p className="text-xs text-[var(--edge-text-secondary)]">No screens yet.</p>
        ) : (
          <div className="space-y-0.5">
            {state.savedScreens.map((screen) => {
              const isActive = state.activeScreenId === screen.id;
              return (
                <div
                  key={screen.id}
                  className={`flex min-w-0 items-center gap-0.5 rounded-sm border-l-2 px-0.5 ${
                    isActive
                      ? "border-[var(--edge-accent-blue)] bg-[var(--edge-surface-active)]"
                      : "border-transparent"
                  }`}
                  data-testid={isActive ? "screener-screen-active-row" : undefined}
                >
                  <button
                    type="button"
                    data-testid={`screener-screen-${screen.id}`}
                    title={screen.name}
                    aria-current={isActive ? "true" : undefined}
                    className={`edge-focus-ring block min-w-0 flex-1 truncate px-1 py-1 text-left text-xs ${
                      isActive
                        ? "font-medium text-[var(--edge-text-strong)]"
                        : "text-[var(--edge-text-primary)] hover:text-[var(--edge-accent-blue)]"
                    }`}
                    onClick={() => handleLoadScreen(screen.id)}
                  >
                    {screen.name}
                  </button>
                  {!screen.isStarter ? (
                    <button
                      type="button"
                      aria-label={`Delete ${screen.name}`}
                      data-testid={`screener-delete-${screen.id}`}
                      className="edge-focus-ring rounded px-1 text-[10px] text-[var(--edge-negative)]"
                      onClick={() => handleDeleteSavedScreen(screen.id)}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div
        className="shrink-0 border-t border-[var(--edge-border-subtle)] px-2 py-2"
        data-testid="screener-screens-save-slot"
      >
        <ScreenerSaveControls active={active} />
      </div>
    </aside>
  );

  const bodyLayoutClass =
    variant === "app"
      ? "flex min-h-0 flex-1 overflow-hidden"
      : variant === "modal"
        ? "flex max-h-[min(78vh,760px)] min-h-[420px] overflow-hidden"
        : variant === "floating"
          ? "flex min-h-0 flex-1 overflow-hidden"
          : "flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row";

  const mainColumnPadding =
    variant === "app" ? "min-w-0 pl-4" : "min-w-0 px-4 py-3";

  const inner = (
    <div className={bodyLayoutClass} ref={resolvedLayoutRef}>
      {screensAside}

      <div className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${mainColumnPadding}`}>
        <div className={showQueryEditor && hasRun ? "mb-2 shrink-0" : "mb-3 shrink-0"}>
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className="truncate text-sm font-medium text-[var(--edge-text-strong)]"
                data-testid="screener-active-screen-name"
                title={activeName}
              >
                {activeName}
              </p>
              <h3 className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
                {showFilterSummary ? "Active filters" : "Custom query"}
              </h3>
            </div>
            {!runInChrome ? runControls : null}
          </div>

          {!hasRun ? (
            <div className="mb-3 space-y-2" data-testid="screener-never-run-hint">
              <p className="text-xs text-[var(--edge-text-secondary)]">
                Pick a screen from the list or build your own filters.
              </p>
            </div>
          ) : null}

          {showFilterSummary ? (
            <div className="space-y-2" data-testid="screener-scan-summary">
              <FilterChipSummary root={queryRoot} />
              <EdgeButton
                type="button"
                data-testid="screener-edit-filters"
                onClick={handleEditFilters}
              >
                Edit filters
              </EdgeButton>
            </div>
          ) : null}

          {showQueryEditor ? (
            <QueryBuilder root={queryRoot} onRootChange={setQueryRoot} />
          ) : null}
        </div>

        {resultsSlot ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{resultsSlot}</div>
        ) : null}
      </div>
    </div>
  );

  if (variant === "app") {
    return (
      <div
        data-testid="screener-unified-view"
        className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3"
      >
        <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <h2
            className="text-sm font-semibold text-[var(--edge-text-strong)]"
            data-testid="screener-title"
          >
            Stock Screener
          </h2>
          {runControls}
        </div>
        {inner}
      </div>
    );
  }

  return inner;
}

/** Run controls for modal/shell chrome (Option B — keep header calm, Run on the right). */
export function ScreenerRunControls({ active }: { active: boolean }) {
  const { setState, loading, limit, runCustomQuery } = useScreenerSessionModel(active);

  const limitOptions = SCREEN_LIMIT_OPTIONS.includes(
    limit as (typeof SCREEN_LIMIT_OPTIONS)[number],
  )
    ? SCREEN_LIMIT_OPTIONS
    : [...SCREEN_LIMIT_OPTIONS, limit].sort((a, b) => a - b);

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="screener-run-controls">
      <label className="inline-flex items-center">
        <span className="sr-only">Result limit</span>
        <select
          value={limit}
          onChange={(event) =>
            setState((prev) =>
              patchScreenerState(prev, {
                query: { ...prev.query, limit: Number(event.target.value) || 200 },
              }),
            )
          }
          className="edge-focus-ring rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1.5 text-xs text-[var(--edge-text-primary)]"
          data-testid="screener-limit-select"
          aria-label="Result limit"
        >
          {limitOptions.map((option) => (
            <option key={option} value={option}>
              Top {option}
            </option>
          ))}
        </select>
      </label>
      <EdgeButton
        type="button"
        variant="primary"
        data-testid="screener-run-button"
        onClick={() => void runCustomQuery()}
        disabled={loading}
      >
        <span className="inline-flex items-center gap-1.5">
          {loading ? (
            <span
              className="h-3 w-3 animate-spin rounded-full border border-[var(--edge-border)] border-t-[var(--edge-text-strong)]"
              aria-hidden
            />
          ) : (
            <span aria-hidden>▶</span>
          )}
          <span>{loading ? "Running…" : "Run"}</span>
        </span>
      </EdgeButton>
      <span
        className="text-[10px] text-[var(--edge-text-muted)]"
        data-testid="screener-run-shortcut-hint"
      >
        ⌘↵
      </span>
    </div>
  );
}
