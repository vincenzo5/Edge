import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import JournalTradeStarRating from "./JournalTradeStarRating";

describe("JournalTradeStarRating", () => {
  it("renders five stars and sets rating on click", () => {
    const onChange = vi.fn();
    render(<JournalTradeStarRating value={null} onChange={onChange} />);

    expect(screen.getByTestId("journal-trade-rating-star-1")).toBeInTheDocument();
    expect(screen.getByTestId("journal-trade-rating-star-5")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("journal-trade-rating-star-4"));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("clears rating when clicking the active star again", () => {
    const onChange = vi.fn();
    render(<JournalTradeStarRating value={3} onChange={onChange} />);

    fireEvent.click(screen.getByTestId("journal-trade-rating-star-3"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("shows filled stars up to the current value", () => {
    render(<JournalTradeStarRating value={2} onChange={vi.fn()} />);

    expect(screen.getByTestId("journal-trade-rating-star-1")).toHaveAttribute("data-filled", "true");
    expect(screen.getByTestId("journal-trade-rating-star-2")).toHaveAttribute("data-filled", "true");
    expect(screen.getByTestId("journal-trade-rating-star-3")).toHaveAttribute("data-filled", "false");
  });
});
