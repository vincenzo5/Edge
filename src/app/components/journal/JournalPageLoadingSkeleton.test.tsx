import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import JournalPageLoadingSkeleton from "./JournalPageLoadingSkeleton";

describe("JournalPageLoadingSkeleton", () => {
  it("renders dashboard skeleton with accessibility attributes", () => {
    render(<JournalPageLoadingSkeleton variant="dashboard" />);
    const root = screen.getByTestId("journal-page-loading");
    expect(root).toHaveAttribute("data-variant", "dashboard");
    expect(root).toHaveAttribute("role", "status");
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("journal-page-loading-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("journal-page-loading-kpis")).toBeInTheDocument();
    expect(screen.getByTestId("journal-page-loading-panels")).toBeInTheDocument();
  });

  it("renders trades table skeleton variant", () => {
    render(<JournalPageLoadingSkeleton variant="trades" />);
    expect(screen.getByTestId("journal-page-loading")).toHaveAttribute("data-variant", "trades");
    expect(screen.getByTestId("journal-page-loading-table")).toBeInTheDocument();
    expect(screen.queryByTestId("journal-page-loading-panels")).not.toBeInTheDocument();
  });
});
