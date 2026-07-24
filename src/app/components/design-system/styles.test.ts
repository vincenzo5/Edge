import { describe, it, expect } from "vitest";
import {
  annotationTextClass,
  bodyTextClass,
  chipClass,
  clearButtonClass,
  compactControlClass,
  fieldClass,
  headerButtonClass,
  headerChipClass,
  destructiveButtonClass,
  linkActionClass,
  menuItemClass,
  modalShellClass,
  panelTitleClass,
  popoverPanelClass,
  primaryButtonClass,
  secondaryButtonClass,
  segmentedTabClass,
  underlineTabClass,
  selectClass,
} from "./styles";

describe("design-system styles", () => {
  it("exposes destructive and link action helpers", () => {
    expect(destructiveButtonClass("dark")).toContain("--edge-negative");
    expect(linkActionClass()).toContain("--edge-accent-blue");
    expect(linkActionClass(true)).toContain("opacity-40");
  });

  it("returns Edge token-based chrome classes", () => {
    expect(popoverPanelClass("dark")).toContain("edge-popover");
    expect(popoverPanelClass("dark")).toContain("--edge-radius-lg");
    expect(modalShellClass()).toContain("edge-modal-shell");
    expect(modalShellClass()).toContain("--edge-radius-dialog");
    expect(headerButtonClass("dark", true)).toContain("--edge-surface-active");
    expect(secondaryButtonClass("dark")).toContain("border-[var(--edge-border)]");
    expect(menuItemClass("dark", false, false)).toContain("--edge-text-primary");
    expect(segmentedTabClass(true)).toContain("--edge-surface-active");
    expect(underlineTabClass(true)).toContain("--edge-accent-blue");
    expect(chipClass(true)).toContain("--edge-text-strong");
  });

  it("uses compact control heights and body typography", () => {
    expect(headerButtonClass("dark")).toContain(compactControlClass());
    expect(headerButtonClass("dark")).toContain(bodyTextClass());
    expect(headerChipClass()).toContain(compactControlClass());
    expect(headerChipClass()).toContain(bodyTextClass());
  });

  it("uses accessible primary fill and on-accent text", () => {
    expect(primaryButtonClass("dark")).toContain("--edge-accent-blue-fill");
    expect(primaryButtonClass("dark")).toContain("--edge-text-on-accent");
    expect(primaryButtonClass("dark")).toContain(compactControlClass());
  });

  it("exposes typography role helpers", () => {
    expect(panelTitleClass()).toContain("edge-type-panel-title");
    expect(panelTitleClass(true)).toContain("edge-type-panel-title-strong");
    expect(bodyTextClass()).toContain("edge-type-body");
    expect(annotationTextClass()).toContain("edge-type-annotation");
  });

  it("exposes field and select density/state helpers", () => {
    expect(fieldClass()).toContain("--edge-surface-panel");
    expect(fieldClass({ density: "compact" })).toContain(compactControlClass());
    expect(fieldClass({ disabled: true })).toContain("opacity-40");
    expect(fieldClass({ invalid: true })).toContain("--edge-negative");
    expect(selectClass({ density: "standard" })).toContain("--edge-border");
    expect(clearButtonClass()).toContain("--edge-surface-active");
    expect(headerChipClass(true)).toContain("opacity-40");
  });
});
