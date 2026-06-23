import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getShortcutLabel, SHORTCUT_BINDINGS } from "./formatShortcutLabel";

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
    expect(getShortcutLabel("quickSearch")).toBe("⌘ K");
    expect(getShortcutLabel("snapshotDownload")).toBe("⌥ ⌘ S");
  });

  it("includes every shortcut id in bindings", () => {
    const ids = [
      "quickSearch",
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
    ] as const;

    for (const id of ids) {
      expect(SHORTCUT_BINDINGS[id].length).toBeGreaterThan(0);
      expect(getShortcutLabel(id)).not.toBe("");
    }
  });
});
