import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import PlaceholderTile from "./PlaceholderTile";

describe("PlaceholderTile", () => {
  it("renders assign buttons for chart screener journal", () => {
    render(<PlaceholderTile onAssign={vi.fn()} />);
    expect(screen.getByTestId("placeholder-assign-chart")).toBeInTheDocument();
    expect(screen.getByTestId("placeholder-assign-screener")).toBeInTheDocument();
    expect(screen.getByTestId("placeholder-assign-journal")).toBeInTheDocument();
  });

  it("calls onAssign when a surface is chosen", () => {
    const onAssign = vi.fn();
    render(<PlaceholderTile onAssign={onAssign} />);
    fireEvent.click(screen.getByTestId("placeholder-assign-screener"));
    expect(onAssign).toHaveBeenCalledWith("screener");
  });
});
