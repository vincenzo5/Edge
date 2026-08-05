/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CompactSearchFieldShell, { compactSearchFieldClass } from "./CompactSearchFieldShell";

describe("CompactSearchFieldShell", () => {
  it("renders children with trailing search icon", () => {
    render(
      <CompactSearchFieldShell>
        <input aria-label="Exact symbol filter" data-testid="field" />
      </CompactSearchFieldShell>,
    );

    expect(screen.getByTestId("field")).toBeTruthy();
    const iconWrap = document.querySelector("svg")?.parentElement;
    expect(iconWrap).toBeTruthy();
    expect(iconWrap?.className).toContain("text-[var(--edge-text-muted)]");
    expect(iconWrap?.className).not.toContain("bg-[var(--edge-surface-chart)]");
  });

  it("exposes compact field class recipe", () => {
    expect(compactSearchFieldClass()).toContain("--edge-surface-input");
    expect(compactSearchFieldClass()).toContain("pr-9");
    expect(compactSearchFieldClass()).toContain("rounded-full");
    expect(compactSearchFieldClass()).not.toContain("rounded-[var(--edge-radius-sm)]");
    expect(compactSearchFieldClass()).toContain("edge-control-compact");
  });
});
