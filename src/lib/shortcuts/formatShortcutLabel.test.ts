import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getShortcutLabel, SHORTCUT_BINDINGS } from "./formatShortcutLabel";
import type { ShortcutId } from "./shortcutTypes";

describe("formatShortcutLabel", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { platform: "MacIntel" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("formats mac shortcuts with symbols", () => {
    expect(getShortcutLabel("undo")).toBe("⌘ Z");
    expect(getShortcutLabel("redo")).toBe("⌘ ⇧ Z");
    expect(getShortcutLabel("openCommandPalette")).toBe("⌘ K");
    expect(getShortcutLabel("changeSymbol")).toBe("/");
    expect(getShortcutLabel("snapshotDownload")).toBe("⌥ ⌘ S");
    expect(getShortcutLabel("lockDrawing")).toBe("⌥ ⇧ L");
  });

  it("includes every shortcut id in bindings", () => {
    const ids = [
      "openCommandPalette",
      "changeSymbol",
      "openIndicators",
      "toggleTheme",
      "toggleAccount",
      "toggleSettings",
      "toggleOptions",
      "toggleScreenerPanel",
      "toggleTradePanel",
      "togglePatternsPanel",
      "undo",
      "redo",
      "copyDrawing",
      "pasteDrawing",
      "deleteDrawing",
      "duplicateDrawing",
      "renameDrawing",
      "lockDrawing",
      "goToDate",
      "resetChartView",
      "snapshotDownload",
      "snapshotCopy",
      "fullscreen",
      "toggleObjectTree",
      "toggleWatchlist",
      "toggleLinkedLayout",
      "activateCell1",
      "activateCell2",
      "activateCell3",
      "activateCell4",
      "invertScale",
      "patternCaptureToggle",
      "patternCaptureUndo",
      "patternCaptureSave",
    ] as const satisfies readonly ShortcutId[];

    for (const id of ids) {
      expect(SHORTCUT_BINDINGS[id]).toBeDefined();
      if (SHORTCUT_BINDINGS[id].length > 0) {
        expect(getShortcutLabel(id)).not.toBe("");
      }
    }
  });
});
