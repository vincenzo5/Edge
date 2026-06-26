import { describe, it, expect } from "vitest";
import {
  chipClass,
  headerButtonClass,
  menuItemClass,
  modalShellClass,
  popoverPanelClass,
  segmentedTabClass,
} from "./styles";

describe("design-system styles", () => {
  it("returns Edge token-based chrome classes", () => {
    expect(popoverPanelClass("dark")).toContain("edge-popover");
    expect(modalShellClass()).toContain("edge-modal-shell");
    expect(headerButtonClass("dark", true)).toContain("--edge-surface-active");
    expect(menuItemClass("dark", false, false)).toContain("--edge-text-primary");
    expect(segmentedTabClass(true)).toContain("--edge-surface-active");
    expect(chipClass(true)).toContain("--edge-text-strong");
  });
});
