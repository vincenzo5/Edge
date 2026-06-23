import { vi } from "vitest";
import type { ActiveChartSnapshot } from "@/app/components/ActiveChartContext";

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
