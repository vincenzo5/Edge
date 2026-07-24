/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import EdgeBorderLabeledControl from "./EdgeBorderLabeledControl";

describe("EdgeBorderLabeledControl", () => {
  it("renders label on the top outline with accessible id", () => {
    render(
      <EdgeBorderLabeledControl label="Period" labelId="period-label">
        <button type="button" aria-labelledby="period-label">
          All time
        </button>
      </EdgeBorderLabeledControl>,
    );

    const label = screen.getByText("Period");
    expect(label).toHaveAttribute("id", "period-label");
    expect(label.className).toContain("-translate-y-1/2");
    expect(label.className).toContain("--edge-surface-panel");
  });

  it("uses toolbar surface when requested", () => {
    render(
      <EdgeBorderLabeledControl label="Account" labelId="account-label" labelSurface="toolbar">
        <button type="button">Paper IRA</button>
      </EdgeBorderLabeledControl>,
    );

    expect(screen.getByText("Account").className).toContain("--edge-surface-toolbar");
  });
});
