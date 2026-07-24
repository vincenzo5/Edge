import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomeHubCards from "./HomeHubCards";

describe("HomeHubCards", () => {
  it("leads with Research Session and Talk cards", () => {
    render(<HomeHubCards />);
    const cards = screen.getAllByRole("link");
    expect(cards[0]).toHaveAttribute("data-testid", "home-hub-research");
    expect(cards[1]).toHaveAttribute("data-testid", "home-hub-copilot");
    expect(screen.getByText("Research Session")).toBeTruthy();
    expect(screen.getByText("Talk")).toBeTruthy();
  });

  it("includes Desk and keeps Charts, Journal, and Screener module cards", () => {
    render(<HomeHubCards />);
    expect(screen.getByTestId("home-hub-desk")).toBeTruthy();
    expect(screen.getByTestId("home-hub-chart")).toBeTruthy();
    expect(screen.getByTestId("home-hub-journal")).toBeTruthy();
    expect(screen.getByTestId("home-hub-screener")).toBeTruthy();
    expect(screen.getByText("Talk → pin → Board → Desk when needed")).toBeTruthy();
  });
});
