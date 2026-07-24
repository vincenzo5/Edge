import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EdgeButton from "./EdgeButton";
import EdgeIconButton from "./EdgeIconButton";

describe("EdgeButton", () => {
  it("applies primary fill tokens for variant primary", () => {
    render(<EdgeButton variant="primary">Run</EdgeButton>);
    const button = screen.getByRole("button", { name: "Run" });
    expect(button.className).toContain("--edge-accent-blue-fill");
    expect(button.className).toContain("--edge-text-on-accent");
    expect(button.className).toContain("edge-control-compact");
  });

  it("applies compact chrome classes for default variant", () => {
    render(<EdgeButton>Cancel</EdgeButton>);
    const button = screen.getByRole("button", { name: "Cancel" });
    expect(button.className).toContain("edge-control-compact");
    expect(button.className).toContain("edge-type-body");
  });

  it("exposes busy state while loading", () => {
    render(<EdgeButton loading>Sync fills</EdgeButton>);
    const button = screen.getByRole("button", { name: "Sync fills" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
  });

  it("applies destructive variant classes", () => {
    render(<EdgeButton variant="destructive">Delete</EdgeButton>);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.className).toContain("text-[var(--edge-negative)]");
    expect(button.className).toContain("border-[var(--edge-negative)]");
  });

  it("applies link variant classes", () => {
    render(<EdgeButton variant="link">Clear all</EdgeButton>);
    const button = screen.getByRole("button", { name: "Clear all" });
    expect(button.className).toContain("text-[var(--edge-accent-blue)]");
  });
});

describe("EdgeIconButton", () => {
  it("uses compact 32px target by default", () => {
    render(
      <EdgeIconButton aria-label="Settings">
        <span>S</span>
      </EdgeIconButton>,
    );
    const button = screen.getByRole("button", { name: "Settings" });
    expect(button.className).toContain("--edge-control-height-compact");
  });

  it("uses standard 36px target when requested", () => {
    render(
      <EdgeIconButton aria-label="Settings" size="standard">
        <span>S</span>
      </EdgeIconButton>,
    );
    const button = screen.getByRole("button", { name: "Settings" });
    expect(button.className).toContain("--edge-control-height-standard");
  });

  it("sets aria-pressed when active", () => {
    render(
      <EdgeIconButton aria-label="Settings" active>
        <span>S</span>
      </EdgeIconButton>,
    );
    expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute("aria-pressed", "true");
  });
});
