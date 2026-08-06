import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BuySellToggle } from "./BuySellToggle";

describe("BuySellToggle", () => {
  it("renders sell/buy halves and center last pill", () => {
    render(
      <BuySellToggle
        side="BUY"
        onChange={vi.fn()}
        lastPrice={135.16}
        formatLast={(value) => value.toFixed(2)}
      />,
    );
    expect(screen.getByTestId("trade-side-buy")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("trade-last-price-pill")).toHaveTextContent("135.16");
    expect(screen.getAllByText("135.16").length).toBeGreaterThanOrEqual(2);
  });

  it("calls onChange when sell is selected", () => {
    const onChange = vi.fn();
    render(<BuySellToggle side="BUY" onChange={onChange} lastPrice={100} />);
    fireEvent.click(screen.getByTestId("trade-side-sell"));
    expect(onChange).toHaveBeenCalledWith("SELL");
  });
});
