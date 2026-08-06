import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PositionDrawingInputs from "./PositionDrawingInputs";
import type { PositionSettingsDraft } from "@edge/chart-core";

const baseDraft: PositionSettingsDraft = {
  entry: 100,
  stop: 95,
  target: 110,
  riskPercent: 1,
  riskUnit: "percent",
  tickSize: 0.01,
};

describe("PositionDrawingInputs", () => {
  it("renders risk, entry, profit level, and stop level fields", () => {
    render(
      <PositionDrawingInputs
        draft={baseDraft}
        direction="long"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("position-drawing-inputs")).toBeInTheDocument();
    expect(screen.getByTestId("position-inputs-risk")).toHaveValue(1);
    expect(screen.getByTestId("position-inputs-entry")).toBeInTheDocument();
    expect(screen.getByTestId("position-inputs-profit-ticks")).toBeInTheDocument();
    expect(screen.getByTestId("position-inputs-profit-price")).toBeInTheDocument();
    expect(screen.getByTestId("position-inputs-stop-ticks")).toBeInTheDocument();
    expect(screen.getByTestId("position-inputs-stop-price")).toBeInTheDocument();
    expect(screen.queryByText(/account size/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/lot size/i)).not.toBeInTheDocument();
  });

  it("updates target when profit ticks change", () => {
    const onChange = vi.fn();
    render(
      <PositionDrawingInputs
        draft={baseDraft}
        direction="long"
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByTestId("position-inputs-profit-ticks"), {
      target: { value: "2000" },
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: 120 }),
    );
  });
});
