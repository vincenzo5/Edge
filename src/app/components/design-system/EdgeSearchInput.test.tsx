/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EdgeSearchInput from "./EdgeSearchInput";

describe("EdgeSearchInput", () => {
  it("exposes accessible label and compact density shell", () => {
    render(
      <EdgeSearchInput
        aria-label="Search indicators"
        density="compact"
        placeholder="Search"
        data-testid="search-input"
      />,
    );

    expect(screen.getByLabelText("Search indicators")).toBeTruthy();
    expect(screen.getByTestId("search-input")).toHaveAttribute("aria-label", "Search indicators");
  });

  it("renders labeled clear control and calls onClear", () => {
    const onClear = vi.fn();
    render(
      <EdgeSearchInput
        aria-label="Search symbols"
        value="AAPL"
        onClear={onClear}
        clearLabel="Clear symbol search"
        readOnly
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear symbol search" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("marks invalid and loading states", () => {
    render(
      <EdgeSearchInput
        aria-label="Search"
        invalid
        loading
        data-testid="search-input"
      />,
    );

    const input = screen.getByTestId("search-input");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-busy")).toBe("true");
  });
});
