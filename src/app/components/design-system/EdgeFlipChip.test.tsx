/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EdgeFlipChip from "./EdgeFlipChip";

describe("EdgeFlipChip", () => {
  it("shows the current option label and flips on click", () => {
    const onChange = vi.fn();
    render(
      <EdgeFlipChip
        value="BUY"
        options={[
          { value: "BUY", label: "Buy" },
          { value: "SELL", label: "Sell" },
        ]}
        onChange={onChange}
        ariaLabel="Side"
        testId="flip"
      />,
    );

    expect(screen.getByTestId("flip")).toHaveTextContent("Buy");
    fireEvent.click(screen.getByTestId("flip"));
    expect(onChange).toHaveBeenCalledWith("SELL");
  });

  it("flips from the second option back to the first", () => {
    const onChange = vi.fn();
    render(
      <EdgeFlipChip
        value="LMT"
        options={[
          { value: "MKT", label: "Market" },
          { value: "LMT", label: "Limit" },
        ]}
        onChange={onChange}
        ariaLabel="Type"
        testId="flip-type"
      />,
    );

    fireEvent.click(screen.getByTestId("flip-type"));
    expect(onChange).toHaveBeenCalledWith("MKT");
  });
});
