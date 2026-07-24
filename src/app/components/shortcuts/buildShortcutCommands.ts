import { SHORTCUT_BINDINGS } from "@/lib/shortcuts/formatShortcutLabel";
import type { ShortcutCommand } from "@/lib/shortcuts/shortcutTypes";
import type { AppActionsContextValue } from "@/app/components/AppActionsContext";
import type { ActiveChartSnapshot } from "@/app/components/ActiveChartContext";
import type { OverlayHandlers } from "./ShortcutUIContext";
import { cellCountFor, type SidebarPanelId } from "@/lib/chartConfig";

export type ShortcutCommandDeps = {
  appActions: AppActionsContextValue | null;
  activeChart: ActiveChartSnapshot | null;
  commandPalette: OverlayHandlers | null;
  symbolSearch: OverlayHandlers | null;
  toggleTheme: (() => void) | null;
  openPositionsMenu: OverlayHandlers | null;
  hasOpenPositions: (() => boolean) | null;
};

function bindings(id: keyof typeof SHORTCUT_BINDINGS) {
  return SHORTCUT_BINDINGS[id];
}

function toggleSidebarPanel(
  appActions: AppActionsContextValue,
  panel: SidebarPanelId,
): void {
  const current = appActions.getLayout().sidebar?.activePanel ?? null;
  appActions.setSidebarPanel(current === panel ? null : panel);
}

export function buildShortcutCommands(deps: ShortcutCommandDeps): ShortcutCommand[] {
  const {
    appActions,
    activeChart,
    commandPalette,
    symbolSearch,
    toggleTheme,
    openPositionsMenu,
    hasOpenPositions,
  } = deps;
  const chart = activeChart?.chartCommands;
  const drawing = activeChart?.drawingCommands;
  const ui = activeChart?.uiCommands;

  const commands: ShortcutCommand[] = [];

  if (commandPalette) {
    commands.push({
      id: "openCommandPalette",
      scope: "app",
      keys: bindings("openCommandPalette"),
      run: () => commandPalette.open(),
    });
  }

  if (symbolSearch) {
    commands.push({
      id: "changeSymbol",
      scope: "app",
      keys: bindings("changeSymbol"),
      enabled: () => !commandPalette?.isOpen(),
      run: () => symbolSearch.open(),
    });
  }

  if (toggleTheme) {
    commands.push({
      id: "toggleTheme",
      scope: "app",
      keys: bindings("toggleTheme"),
      run: () => toggleTheme(),
    });
  }

  if (openPositionsMenu) {
    commands.push({
      id: "openPositions",
      scope: "app",
      keys: bindings("openPositions"),
      enabled: () => (hasOpenPositions ? hasOpenPositions() : true),
      run: () => openPositionsMenu.open(),
    });
  }

  if (activeChart) {
    commands.push({
      id: "openIndicators",
      scope: "chart",
      keys: bindings("openIndicators"),
      run: () => activeChart.openIndicatorPicker(),
    });
  }

  if (chart) {
    commands.push(
      {
        id: "undo",
        scope: "chart",
        keys: bindings("undo"),
        enabled: () => chart.canUndo(),
        run: () => {
          activeChart?.headerCommands.undo();
        },
      },
      {
        id: "redo",
        scope: "chart",
        keys: bindings("redo"),
        enabled: () => chart.canRedo(),
        run: () => {
          activeChart?.headerCommands.redo();
        },
      },
      {
        id: "goToDate",
        scope: "chart",
        keys: bindings("goToDate"),
        run: () => ui?.openGoTo(),
      },
      {
        id: "resetChartView",
        scope: "chart",
        keys: bindings("resetChartView"),
        run: () => chart.resetChartView(),
      },
      {
        id: "patternCaptureToggle",
        scope: "chart",
        keys: bindings("patternCaptureToggle"),
        run: () => ui?.togglePatternCapture(),
      },
      {
        id: "patternCaptureUndo",
        scope: "chart",
        keys: bindings("patternCaptureUndo"),
        enabled: () => ui?.isPatternCaptureActive() ?? false,
        run: () => ui?.undoPatternCapture(),
      },
      {
        id: "patternCaptureSave",
        scope: "chart",
        keys: bindings("patternCaptureSave"),
        enabled: () => ui?.canSavePatternCapture() ?? false,
        run: () => void ui?.savePatternCapture(),
      },
      {
        id: "snapshotDownload",
        scope: "chart",
        keys: bindings("snapshotDownload"),
        enabled: () => chart.canCaptureSnapshot(),
        run: () => void ui?.runSnapshot("download"),
      },
      {
        id: "snapshotCopy",
        scope: "chart",
        keys: bindings("snapshotCopy"),
        enabled: () => chart.canCaptureSnapshot(),
        run: () => void ui?.runSnapshot("copy"),
      },
    );
  }

  if (drawing) {
    commands.push(
      {
        id: "copyDrawing",
        scope: "drawing",
        keys: bindings("copyDrawing"),
        enabled: () => drawing.hasSelection(),
        run: () => drawing.copySelected(),
      },
      {
        id: "pasteDrawing",
        scope: "drawing",
        keys: bindings("pasteDrawing"),
        enabled: () => drawing.canPaste(),
        run: () => drawing.pasteDrawings(),
      },
      {
        id: "deleteDrawing",
        scope: "drawing",
        keys: bindings("deleteDrawing"),
        enabled: () => drawing.hasSelection() && !(ui?.isPatternCaptureActive() ?? false),
        run: () => drawing.deleteSelected(),
      },
      {
        id: "duplicateDrawing",
        scope: "drawing",
        keys: bindings("duplicateDrawing"),
        enabled: () => drawing.hasSelection(),
        run: () => drawing.duplicateSelected(),
      },
      {
        id: "renameDrawing",
        scope: "drawing",
        keys: bindings("renameDrawing"),
        enabled: () => drawing.hasSelection(),
        run: () => drawing.renameSelected(),
      },
      {
        id: "lockDrawing",
        scope: "drawing",
        keys: bindings("lockDrawing"),
        enabled: () => drawing.hasSelection(),
        run: () => drawing.toggleLockSelected(),
      },
    );
  }

  if (appActions) {
    const layout = appActions.getLayout();
    const visibleCells = cellCountFor(layout.layoutId);

    commands.push(
      {
        id: "toggleObjectTree",
        scope: "app",
        keys: bindings("toggleObjectTree"),
        run: () => toggleSidebarPanel(appActions, "object-tree"),
      },
      {
        id: "toggleWatchlist",
        scope: "app",
        keys: bindings("toggleWatchlist"),
        run: () => toggleSidebarPanel(appActions, "watchlist"),
      },
      {
        id: "toggleCopilot",
        scope: "app",
        keys: bindings("toggleCopilot"),
        run: () => toggleSidebarPanel(appActions, "copilot"),
      },
      {
        id: "toggleAccount",
        scope: "app",
        keys: bindings("toggleAccount"),
        run: () => toggleSidebarPanel(appActions, "account"),
      },
      {
        id: "toggleSettings",
        scope: "app",
        keys: bindings("toggleSettings"),
        run: () => toggleSidebarPanel(appActions, "settings"),
      },
      {
        id: "toggleOptions",
        scope: "app",
        keys: bindings("toggleOptions"),
        run: () => toggleSidebarPanel(appActions, "options"),
      },
      {
        id: "toggleScreenerPanel",
        scope: "app",
        keys: bindings("toggleScreenerPanel"),
        run: () => toggleSidebarPanel(appActions, "screener"),
      },
      {
        id: "toggleTradePanel",
        scope: "app",
        keys: bindings("toggleTradePanel"),
        run: () => toggleSidebarPanel(appActions, "trade"),
      },
      {
        id: "togglePatternsPanel",
        scope: "app",
        keys: bindings("togglePatternsPanel"),
        run: () => toggleSidebarPanel(appActions, "patterns"),
      },
      {
        id: "toggleLinkedLayout",
        scope: "app",
        keys: bindings("toggleLinkedLayout"),
        enabled: () => !drawing?.hasSelection(),
        run: () => {
          const anyOn =
            layout.linkSymbol ||
            layout.linkInterval ||
            layout.linkCrosshair ||
            layout.linkDrawings;
          appActions.setLayoutSync({
            linkSymbol: !anyOn,
            linkInterval: !anyOn,
            linkCrosshair: !anyOn,
            linkDrawings: !anyOn,
          });
        },
      },
      {
        id: "activateCell1",
        scope: "app",
        keys: bindings("activateCell1"),
        enabled: () => visibleCells >= 1,
        run: () => appActions.setActiveCellIndex(0),
      },
      {
        id: "activateCell2",
        scope: "app",
        keys: bindings("activateCell2"),
        enabled: () => visibleCells >= 2,
        run: () => appActions.setActiveCellIndex(1),
      },
      {
        id: "activateCell3",
        scope: "app",
        keys: bindings("activateCell3"),
        enabled: () => visibleCells >= 3,
        run: () => appActions.setActiveCellIndex(2),
      },
      {
        id: "activateCell4",
        scope: "app",
        keys: bindings("activateCell4"),
        enabled: () => visibleCells >= 4,
        run: () => appActions.setActiveCellIndex(3),
      },
    );
  }

  commands.push({
    id: "fullscreen",
    scope: "app",
    keys: bindings("fullscreen"),
    enabled: () =>
      typeof document !== "undefined" &&
      typeof document.documentElement.requestFullscreen === "function",
    run: () => {
      if (typeof document === "undefined") return;
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else {
        void document.documentElement.requestFullscreen();
      }
    },
  });

  return commands;
}

/** Commands exposed in the palette (includes palette-only entries without key bindings). */
export function buildPaletteCommands(deps: ShortcutCommandDeps): ShortcutCommand[] {
  return buildShortcutCommands(deps);
}

export function findCommandById(
  commands: ShortcutCommand[],
  id: ShortcutCommand["id"],
): ShortcutCommand | undefined {
  return commands.find((command) => command.id === id);
}
