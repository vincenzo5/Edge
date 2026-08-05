/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import EdgeReadout from "./EdgeReadout";

describe("EdgeReadout", () => {
  it("renders label and value without field chrome", () => {
    render(
      <EdgeReadout label="Order Price" value="~123.45" testId="entry-readout" />,
    );

    const root = screen.getByTestId("entry-readout");
    expect(root.textContent).toContain("Order Price");
    expect(root.textContent).toContain("~123.45");
    expect(root.className).not.toContain("border");
    expect(root.querySelector("input")).toBeNull();
  });

  it("supports centered alignment for market-style displays", () => {
    render(
      <EdgeReadout label="Order Price" value="MKT" align="center" testId="center-readout" />,
    );

    expect(screen.getByTestId("center-readout").className).toContain("text-center");
  });

  it("applies tone to value", () => {
    render(<EdgeReadout label="Risk" value="$50" tone="negative" testId="tone-readout" />);

    const value = screen.getByTestId("tone-readout").querySelector(".text-\\[var\\(--edge-negative\\)\\]");
    expect(value).toBeTruthy();
  });
});
