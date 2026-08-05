import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EdgeMetricTile from "./EdgeMetricTile";

describe("EdgeMetricTile", () => {
  it("renders plain label and value", () => {
    render(
      <EdgeMetricTile
        data-testid="metric"
        label="Win rate"
        value="62.5%"
      />,
    );

    expect(screen.getByTestId("metric")).toHaveTextContent("Win rate");
    expect(screen.getByTestId("metric")).toHaveTextContent("62.5%");
  });

  it("renders bordered variant inside grouped metric cards with help icon", () => {
    render(
      <div className="rounded border border-[var(--edge-border)] p-2">
        <EdgeMetricTile
          data-testid="metric"
          label="Buying power"
          value="$50,000.00"
          help="Cash available to spend"
          variant="bordered"
          labelUppercase
        />
      </div>,
    );

    expect(screen.getByLabelText("Buying power help")).toBeInTheDocument();
    const labelRow = screen.getByText("Buying power").closest("div");
    expect(labelRow?.className).toContain("uppercase");
    expect(screen.getByTestId("metric").className).toContain("border");
  });

  it("renders plain variant without border shell by default", () => {
    render(
      <EdgeMetricTile
        data-testid="metric"
        label="Net P&L"
        value="$1,200.00"
        labelUppercase
      />,
    );

    expect(screen.getByTestId("metric").className).not.toContain("border");
  });

  it("applies tone class to value", () => {
    render(
      <EdgeMetricTile
        data-testid="metric"
        label="Net P&L"
        value="-$120.00"
        tone="negative"
      />,
    );

    const value = screen.getByText("-$120.00");
    expect(value.className).toContain("text-[var(--edge-negative)]");
  });
});
