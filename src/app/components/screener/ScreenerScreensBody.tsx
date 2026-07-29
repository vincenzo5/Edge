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
import {
  isSavedScreenDisabledByProviderRestriction,
  SCREENER_FMP_UNAVAILABLE_TITLE,
  screenerHasProviderRestriction,
} from "@/lib/screener/providerWarnings";
import type { SavedScreen } from "@/lib/screener/types";
import { resolveScreenName } from "@/lib/screener/summarizeScreen";
import { useScreenerSessionModel } from "./useScreenerSessionModel";
import { SCREENER_NARROW_LAYOUT_THRESHOLD } from "@/lib/responsive/layoutConstants";
import { EdgeButton, EdgeIconButton, EdgeSelect } from "../design-system";
import { bodyTextClass, compactControlClass, annotationTextClass, headerIconButtonClass } from "../design-system/styles";
import { PencilIcon } from "../chart-chrome/ChartHeaderIcons";
import { useTileDensityOptional } from "../app-workspace/TileDensityContext";
import { useSidebarPanelWidth } from "../sidebar/SidebarPanelWidthContext";
import QueryBuilder from "./QueryBuilder";
import FilterChipSummary from "./FilterChipSummary";
import { ScreenerAlertToggle } from "./ScreenerAlertToggle";

export type ScreenerScreensVariant = "app" | "sidebar" | "modal" | "floating";

const SCREEN_LIMIT_OPTIONS = [50, 100, 200, 500] as const;

function screenChipClassName(isActive: boolean, disabled: boolean): string {
  if (disabled) {
    return `edge-focus-ring shrink-0 cursor-not-allowed rounded-[var(--edge-radius-sm)] border px-2 ${compactControlClass()} ${bodyTextClass()} border-[var(--edge-border-subtle)] bg-[var(--edge-surface-panel)] text-[var(--edge-text-muted)] opacity-60`;
  }
  return `edge-focus-ring shrink-0 rounded-[var(--edge-radius-sm)] border px-2 ${compactControlClass()} ${bodyTextClass()} ${
    isActive
      ? "border-[var(--edge-accent-blue)] bg-[var(--edge-surface-active)] font-medium text-[var(--edge-text-strong)]"
      : "border-[var(--edge-border)] bg-[var(--edge-surface-panel)] text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-hover)]"
  }`;
}

function ScreenerScreenChip({
  screen,
  isActive,
  disabled,
  testId,
  onSelect,
}: {
  screen: SavedScreen;
  isActive: boolean;
  disabled: boolean;
  testId: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-current={isActive ? "true" : undefined}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      title={disabled ? SCREENER_FMP_UNAVAILABLE_TITLE : screen.name}
      className={screenChipClassName(isActive, disabled)}
      onClick={() => {
        if (disabled) return;
        onSelect();
      }}
    >
      {screen.name}
    </button>
  );
}

function ScreenerRunButtonLabel({ loading }: { loading: boolean }) {
  if (loading) return <>Running…</>;
  return (
    <>
      Run
      <span
        className="opacity-80"
        data-testid="screener-run-shortcut-hint"
        aria-hidden="true"
      >
        ⌘↵
      </span>
    </>
  );
}

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

function ScreenNameSaveIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 8.5l3 3L13 4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Inline rename: text + pencil in view mode; compact input + save in edit mode. */
function ScreenerScreenNameSave({
  activeName,
  activeScreenId,
  error,
  onSave,
}: {
  activeName: string;
  activeScreenId: string | null;
  error: string | null;
  onSave: (name: string) => boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    if (editing) return;
    setDraftName(activeName === "Untitled screen" ? "" : activeName);
  }, [activeName, activeScreenId, editing]);

  const beginEdit = () => {
    setDraftName(activeName === "Untitled screen" ? "" : activeName);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraftName(activeName === "Untitled screen" ? "" : activeName);
    setEditing(false);
  };

  const handleSave = () => {
    const name = draftName.trim();
    if (!name) return;
    if (onSave(name)) {
      setEditing(false);
    }
  };

  return (
    <div className="w-fit max-w-full" data-testid="screener-screen-name-save">
      <div className="flex w-fit max-w-full items-center gap-1.5">
        {editing ? (
          <input
            type="text"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Untitled screen"
            aria-label="Screen name"
            data-testid="screener-save-name"
            autoFocus
            className={`edge-focus-ring ${compactControlClass()} box-border w-44 max-w-[220px] shrink-0 rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-[var(--edge-space-2)] ${bodyTextClass()} text-[var(--edge-text-primary)] placeholder:text-[var(--edge-text-muted)]`}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                cancelEdit();
              }
              if (event.key === "Enter" && draftName.trim()) {
                handleSave();
              }
            }}
          />
        ) : (
          <p
            className="truncate text-sm font-medium text-[var(--edge-text-strong)]"
            data-testid="screener-active-screen-name"
            title={activeName}
          >
            {activeName}
          </p>
        )}
        <EdgeIconButton
          type="button"
          size="compact"
          aria-label={editing ? "Save screen name" : "Rename screen"}
          data-testid={editing ? "screener-save-button" : "screener-rename-open"}
          disabled={editing && !draftName.trim()}
          onClick={editing ? handleSave : beginEdit}
        >
          {editing ? <ScreenNameSaveIcon /> : <PencilIcon size={14} />}
        </EdgeIconButton>
      </div>
      {error ? (
        <p
          className="mt-1 text-xs text-[var(--edge-negative)]"
          data-testid="screener-save-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <span className={`mt-0.5 block ${annotationTextClass()} uppercase tracking-wide text-[var(--edge-text-muted)]`}>
        Custom query
      </span>
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
  const tileDensity = useTileDensityOptional();
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
    handleSaveScreen,
    hasRun,
    filterViewMode,
    setFilterViewMode,
    rows,
    warnings,
  } = useScreenerSessionModel(active);

  const providerRestrictionActive = screenerHasProviderRestriction(warnings);
  const isScreenDisabled = useCallback(
    (screen: SavedScreen) =>
      isSavedScreenDisabledByProviderRestriction(screen, warnings),
    [warnings],
  );

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
      : variant === "app" && tileDensity
        ? tileDensity.width
        : measuredWidth;
  const isNarrow =
    variant === "app" && tileDensity
      ? tileDensity.mode === "compact"
      : panelWidth < SCREENER_NARROW_LAYOUT_THRESHOLD;

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
    <EdgeSelect
      testId="screener-limit-select"
      variant="chip"
      label="Limit"
      density="compact"
      value={String(limit)}
      onChange={(next) =>
        setState((prev) =>
          patchScreenerState(prev, {
            query: { ...prev.query, limit: Number(next) || 200 },
          }),
        )
      }
      options={limitOptions.map((option) => ({
        value: String(option),
        label: String(option),
      }))}
      minWidth={120}
      align="end"
    />
  );

  const runControls = (
    <div className="flex flex-wrap items-center gap-2" data-testid="screener-run-controls">
      {limitControl}
      <EdgeButton
        type="button"
        variant="primary"
        data-testid="screener-run-button"
        aria-keyshortcuts="Meta+Enter Control+Enter"
        onClick={handleRunCustomQuery}
        disabled={loading}
        loading={loading}
      >
        <ScreenerRunButtonLabel loading={loading} />
      </EdgeButton>
    </div>
  );

  const screensAsideWidth =
    variant === "sidebar" ? "lg:w-36" : "w-40";

  const showScreensAside =
    variant === "app"
      ? false
      : variant === "modal"
        ? !isNarrow
        : variant === "floating"
          ? !isNarrow
          : !isNarrow;

  const showScreenChipsRow = variant === "app" || !showScreensAside;

  const screenChipsRow = showScreenChipsRow ? (
    <div
      className="mb-2 flex shrink-0 gap-1 overflow-x-auto pb-1"
      data-testid="screener-screens-chips"
    >
      {state.savedScreens.map((screen) => {
        const isActive = state.activeScreenId === screen.id;
        const disabled = isScreenDisabled(screen);
        return (
          <ScreenerScreenChip
            key={screen.id}
            screen={screen}
            isActive={isActive}
            disabled={disabled}
            testId={`screener-screen-chip-${screen.id}`}
            onSelect={() => handleLoadScreen(screen.id)}
          />
        );
      })}
    </div>
  ) : null;

  const recentScreens =
    variant === "app"
      ? (state.recentScreenIds ?? [])
          .map((screenId) => state.savedScreens.find((screen) => screen.id === screenId))
          .filter((screen): screen is NonNullable<typeof screen> => screen != null)
      : [];

  const recentScreenChipsRow =
    recentScreens.length > 0 ? (
      <div className="mb-2 shrink-0" data-testid="screener-recent-screens">
        <p
          className={`mb-1 ${annotationTextClass()} uppercase tracking-wide text-[var(--edge-text-muted)]`}
        >
          Recent
        </p>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {recentScreens.map((screen) => {
            const isActive = state.activeScreenId === screen.id;
            const disabled = isScreenDisabled(screen);
            return (
              <ScreenerScreenChip
                key={screen.id}
                screen={screen}
                isActive={isActive}
                disabled={disabled}
                testId={`screener-recent-chip-${screen.id}`}
                onSelect={() => handleLoadScreen(screen.id)}
              />
            );
          })}
        </div>
      </div>
    ) : null;

  const screensAside = (
    <aside
      className={
        !showScreensAside
          ? "hidden"
          : variant === "app" || variant === "modal"
            ? `${screensAsideWidth} flex shrink-0 flex-col self-stretch overflow-hidden border-r border-[var(--edge-border)]`
            : variant === "floating"
              ? `${screensAsideWidth} flex shrink-0 flex-col self-stretch overflow-hidden border-r border-[var(--edge-border)]`
              : `flex shrink-0 flex-col self-stretch overflow-hidden border-b border-[var(--edge-border)] lg:w-36 lg:border-b-0 lg:border-r`
      }
      data-testid="screener-screens-aside"
    >
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-2">
        <p className={`mb-2 ${annotationTextClass()} uppercase tracking-wide text-[var(--edge-text-muted)]`}>
          Screens
        </p>
        {state.savedScreens.length === 0 ? (
          <p className="text-xs text-[var(--edge-text-secondary)]">No screens yet.</p>
        ) : (
          <div className="space-y-0.5">
            {state.savedScreens.map((screen) => {
              const isActive = state.activeScreenId === screen.id;
              const disabled = isScreenDisabled(screen);
              return (
                <div
                  key={screen.id}
                  className={`flex min-w-0 flex-col gap-1 rounded-sm border-l-2 px-0.5 py-0.5 ${
                    isActive
                      ? "border-[var(--edge-accent-blue)] bg-[var(--edge-surface-active)]"
                      : "border-transparent"
                  }`}
                  data-testid={isActive ? "screener-screen-active-row" : undefined}
                >
                  <div className="flex min-w-0 items-center gap-0.5">
                    <button
                      type="button"
                      data-testid={`screener-screen-${screen.id}`}
                      title={disabled ? SCREENER_FMP_UNAVAILABLE_TITLE : screen.name}
                      aria-current={isActive ? "true" : undefined}
                      aria-disabled={disabled || undefined}
                      disabled={disabled}
                      className={`edge-focus-ring block min-w-0 flex-1 truncate px-2 text-left ${compactControlClass()} ${bodyTextClass()} ${
                        disabled
                          ? "cursor-not-allowed text-[var(--edge-text-muted)] opacity-60"
                          : isActive
                            ? "font-medium text-[var(--edge-text-strong)]"
                            : "text-[var(--edge-text-primary)] hover:text-[var(--edge-accent-blue)]"
                      }`}
                      onClick={() => {
                        if (disabled) return;
                        handleLoadScreen(screen.id);
                      }}
                    >
                      {screen.name}
                    </button>
                    {!screen.isStarter ? (
                      <button
                        type="button"
                        aria-label={`Delete ${screen.name}`}
                        data-testid={`screener-delete-${screen.id}`}
                        className={`${headerIconButtonClass("dark")} text-[var(--edge-negative)]`}
                        onClick={() => handleDeleteSavedScreen(screen.id)}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                  <div className="px-2 pb-1">
                    <ScreenerAlertToggle screen={screen} compact />
                  </div>
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
    variant === "app"
      ? "min-w-0"
      : isNarrow
        ? "min-w-0 px-3 py-2"
        : "min-w-0 px-4 py-3";

  const inner = (
    <div className={bodyLayoutClass} ref={resolvedLayoutRef}>
      {screensAside}

      <div className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${mainColumnPadding}`}>
        {variant !== "app" ? screenChipsRow : null}
        <div className={showQueryEditor && hasRun ? "mb-2 shrink-0" : "mb-3 shrink-0"}>
          <div className="mb-2 flex items-start justify-between gap-2">
            {variant === "app" ? (
              <ScreenerScreenNameSave
                activeName={activeName}
                activeScreenId={state.activeScreenId}
                error={error}
                onSave={handleSaveScreen}
              />
            ) : (
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-medium text-[var(--edge-text-strong)]"
                  data-testid="screener-active-screen-name"
                  title={activeName}
                >
                  {activeName}
                </p>
                <span className={`mt-0.5 block ${annotationTextClass()} uppercase tracking-wide text-[var(--edge-text-muted)]`}>
                  {showFilterSummary ? "Active filters" : "Custom query"}
                </span>
              </div>
            )}
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
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {providerRestrictionActive ? (
              <div
                className="mb-2 shrink-0 rounded border border-[var(--edge-warning)]/30 bg-[var(--edge-warning)]/10 px-2 py-1.5 text-[11px] text-[var(--edge-warning)]"
                data-testid="screener-provider-restriction-banner"
                role="alert"
              >
                {warnings.filter((warning) => warning.trim()).join(" ") ||
                  "FMP screener provider is unavailable."}
              </div>
            ) : null}
            {resultsSlot}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (variant === "app") {
    return (
      <div
        data-testid="screener-unified-view"
        className={`flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${isNarrow ? "p-2" : "p-3"}`}
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
        {screenChipsRow}
        {recentScreenChipsRow}
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
      <EdgeSelect
        testId="screener-limit-select"
        variant="chip"
        label="Limit"
        density="compact"
        value={String(limit)}
        onChange={(next) =>
          setState((prev) =>
            patchScreenerState(prev, {
              query: { ...prev.query, limit: Number(next) || 200 },
            }),
          )
        }
        options={limitOptions.map((option) => ({
          value: String(option),
          label: String(option),
        }))}
        minWidth={120}
        align="end"
      />
      <EdgeButton
        type="button"
        variant="primary"
        data-testid="screener-run-button"
        aria-keyshortcuts="Meta+Enter Control+Enter"
        onClick={() => void runCustomQuery()}
        disabled={loading}
        loading={loading}
      >
        <ScreenerRunButtonLabel loading={loading} />
      </EdgeButton>
    </div>
  );
}
