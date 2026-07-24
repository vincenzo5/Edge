/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SymbolSearchTrigger from "./SymbolSearchTrigger";

describe("SymbolSearchTrigger", () => {
  it("opens dialog via button with compact search chrome", () => {
    const onOpen = vi.fn();
    render(<SymbolSearchTrigger symbol="AAPL" onOpen={onOpen} />);

    const trigger = screen.getByTestId("symbol-search-input");
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveTextContent("AAPL");
    expect(trigger.className).toContain("rounded-full");
    expect(trigger.className).toContain("h-7");
    expect(trigger.className).toContain("!min-h-[28px]");
    expect(trigger.parentElement?.className).toContain("min-w-[112px]");
    expect(document.querySelector("svg")).toBeTruthy();

    fireEvent.click(trigger);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("shows placeholder label when symbol is empty", () => {
    render(<SymbolSearchTrigger symbol="" onOpen={vi.fn()} />);
    expect(screen.getByTestId("symbol-search-input")).toHaveTextContent("Symbol");
  });
});
