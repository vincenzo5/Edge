import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createDefaultWorkspaceTabs } from "@/lib/app/workspaceTabs";
import { buildActiveWorkspaceSummary } from "@/lib/app/buildHomeWorkspaceSummaries";
import HomeContinueCard from "./HomeContinueCard";

describe("HomeContinueCard", () => {
  it("renders active workspace and chart link", () => {
    const summary = buildActiveWorkspaceSummary(createDefaultWorkspaceTabs());

    render(<HomeContinueCard summary={summary} loaded />);

    expect(screen.getByText("Continue")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.getByText(/AAPL/)).toBeInTheDocument();
    expect(screen.getByTestId("home-continue-open")).toHaveAttribute("href", "/chart");
  });

  it("shows loading state before summaries hydrate", () => {
    render(<HomeContinueCard summary={null} loaded={false} />);
    expect(screen.getByText("Loading workspace…")).toBeInTheDocument();
  });
});
