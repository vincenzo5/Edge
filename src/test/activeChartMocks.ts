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
    overlayActions,
    dataWindowActions,
    uiCommands,
    onConfigChange,
    openIndicatorPicker,
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
    },
  };
}
