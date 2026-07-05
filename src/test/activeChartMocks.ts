import { vi } from "vitest";
import type {
  ActiveChartRegistration,
  ActiveChartSnapshot,
} from "@/app/components/ActiveChartContext";

export function makeDataWindowActionsMock(
  overrides?: Partial<ActiveChartSnapshot["dataWindowActions"]>,
): ActiveChartSnapshot["dataWindowActions"] {
  return {
    setPriceVisible: vi.fn(),
    setOhlcVisible: vi.fn(),
    setVolumeVisible: vi.fn(),
    setIndicatorVisible: vi.fn(),
    ...overrides,
  };
}

export function makeDrawingCommandsMock(
  overrides?: Partial<ActiveChartSnapshot["drawingCommands"]>,
): ActiveChartSnapshot["drawingCommands"] {
  return {
    hasSelection: vi.fn(() => false),
    deleteSelected: vi.fn(),
    duplicateSelected: vi.fn(),
    renameSelected: vi.fn(),
    toggleLockSelected: vi.fn(),
    copySelected: vi.fn(),
    pasteDrawings: vi.fn(),
    canPaste: vi.fn(() => false),
    ...overrides,
  };
}

export function makeUICommandsMock(
  overrides?: Partial<ActiveChartSnapshot["uiCommands"]>,
): ActiveChartSnapshot["uiCommands"] {
  return {
    openGoTo: vi.fn(),
    runSnapshot: vi.fn(),
    ...overrides,
  };
}

export function makeHeaderActionsMock(
  overrides?: Partial<ActiveChartSnapshot["headerCommands"]>,
): ActiveChartSnapshot["headerCommands"] {
  return {
    replayActive: false,
    canUndo: false,
    canRedo: false,
    openSettings: vi.fn(),
    openStudyTemplate: vi.fn(),
    openChartTemplate: vi.fn(),
    toggleReplay: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    addFavoriteIndicator: vi.fn(),
    ...overrides,
  };
}

export function makeDrawingToolbarActionsMock(
  overrides?: Partial<ActiveChartSnapshot["drawingToolbarActions"]>,
): ActiveChartSnapshot["drawingToolbarActions"] {
  return {
    selectTool: vi.fn(),
    clearDrawings: vi.fn(),
    toggleLockAll: vi.fn(),
    toggleHideAll: vi.fn(),
    toggleMagnet: vi.fn(),
    toggleKeepDrawing: vi.fn(),
    deleteSelected: vi.fn(),
    zoomIn: vi.fn(),
    ...overrides,
  };
}

export function makeDrawingToolbarStateMock(
  overrides?: Partial<ActiveChartSnapshot["drawingToolbarState"]>,
): ActiveChartSnapshot["drawingToolbarState"] {
  return {
    activeTool: "__cursor__",
    allLocked: false,
    allHidden: false,
    hasSelection: false,
    ...overrides,
  };
}

/** Split a flat snapshot fixture into the register() payload shape. */
export function toActiveChartRegistration(
  snapshot: ActiveChartSnapshot,
): ActiveChartRegistration {
  const {
    chartId: _chartId,
    headerCommands,
    headerState,
    config,
    theme,
    overlays,
    dataWindow,
    dataMeta,
    chartCommands,
    drawingCommands,
    drawingToolbarActions,
    overlayActions,
    dataWindowActions,
    uiCommands,
    onConfigChange,
    openIndicatorPicker,
    drawingToolbarState,
  } = snapshot;

  const {
    replayActive,
    canUndo,
    canRedo,
    ...headerActions
  } = headerCommands;

  return {
    chartCommands,
    drawingCommands,
    drawingToolbarActions: drawingToolbarActions ?? makeDrawingToolbarActionsMock(),
    overlayActions,
    dataWindowActions,
    uiCommands,
    headerActions,
    onConfigChange,
    openIndicatorPicker,
    readState: {
      config,
      theme,
      overlays,
      dataWindow,
      dataMeta,
      headerState: headerState ?? { replayActive, canUndo, canRedo },
      drawingToolbarState: drawingToolbarState ?? makeDrawingToolbarStateMock(),
    },
  };
}
