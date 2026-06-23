import type { SnapshotAction } from "@/lib/chart/chartSnapshot";
import { SHORTCUT_BINDINGS } from "@/lib/shortcuts/formatShortcutLabel";
import type { ShortcutCommand } from "@/lib/shortcuts/shortcutTypes";
import type { AppActionsContextValue } from "@/app/components/AppActionsContext";
import type { ActiveChartSnapshot } from "@/app/components/ActiveChartContext";
import type { QuickSearchHandlers } from "./ShortcutUIContext";
import { cellCountFor } from "@/lib/chartConfig";

export type ShortcutCommandDeps = {
  appActions: AppActionsContextValue | null;
  activeChart: ActiveChartSnapshot | null;
  quickSearch: QuickSearchHandlers | null;
};

function bindings(id: keyof typeof SHORTCUT_BINDINGS) {
  return SHORTCUT_BINDINGS[id];
}

export function buildShortcutCommands(deps: ShortcutCommandDeps): ShortcutCommand[] {
  const { appActions, activeChart, quickSearch } = deps;
  const chart = activeChart?.chartCommands;
  const drawing = activeChart?.drawingCommands;
  const ui = activeChart?.uiCommands;

  const commands: ShortcutCommand[] = [];

  if (quickSearch) {
    commands.push({
      id: "quickSearch",
      scope: "app",
      keys: bindings("quickSearch"),
      run: () => quickSearch.open(),
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
        enabled: () => drawing.hasSelection(),
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
    const visibleCells = cellCountFor(layout.gridMode);

    commands.push(
      {
        id: "toggleObjectTree",
        scope: "app",
        keys: bindings("toggleObjectTree"),
        run: () => {
          const current = layout.sidebar?.activePanel ?? null;
          appActions.setSidebarPanel(current === "object-tree" ? null : "object-tree");
        },
      },
      {
        id: "toggleWatchlist",
        scope: "app",
        keys: bindings("toggleWatchlist"),
        run: () => {
          const current = layout.sidebar?.activePanel ?? null;
          appActions.setSidebarPanel(current === "watchlist" ? null : "watchlist");
        },
      },
      {
        id: "toggleLinkedLayout",
        scope: "app",
        keys: bindings("toggleLinkedLayout"),
        enabled: () => !drawing?.hasSelection(),
        run: () => appActions.setLinked(!layout.linked),
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
    enabled: () => typeof document !== "undefined" && typeof document.documentElement.requestFullscreen === "function",
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
