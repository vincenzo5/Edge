import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import JournalSubNav from "./JournalSubNav";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/journal/dashboard"),
}));

describe("JournalSubNav", () => {
  it("renders dashboard, trades, and settings links", () => {
    render(<JournalSubNav />);
    expect(screen.getByTestId("journal-subnav-dashboard")).toHaveAttribute(
      "href",
      "/journal/dashboard",
    );
    expect(screen.getByTestId("journal-subnav-trades")).toHaveAttribute("href", "/journal/trades");
    expect(screen.getByTestId("journal-subnav-settings")).toHaveAttribute(
      "href",
      "/journal/settings",
    );
  });

  it("marks dashboard active on dashboard route", () => {
    render(<JournalSubNav />);
    expect(screen.getByTestId("journal-subnav-dashboard")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("journal-subnav-trades")).not.toHaveAttribute("aria-current");
  });
});
