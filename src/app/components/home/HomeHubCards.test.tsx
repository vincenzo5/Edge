import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomeHubCards from "./HomeHubCards";

describe("HomeHubCards", () => {
  it("leads with Talk and Board research entry cards", () => {
    render(<HomeHubCards />);
    const cards = screen.getAllByRole("link");
    expect(cards[0]).toHaveAttribute("data-testid", "home-hub-copilot");
    expect(cards[1]).toHaveAttribute("data-testid", "home-hub-research");
    expect(screen.getByText("Talk")).toBeTruthy();
    expect(screen.getByText("Board")).toBeTruthy();
  });

  it("keeps Charts, Journal, and Screener module cards", () => {
    render(<HomeHubCards />);
    expect(screen.getByTestId("home-hub-chart")).toBeTruthy();
    expect(screen.getByTestId("home-hub-journal")).toBeTruthy();
    expect(screen.getByTestId("home-hub-screener")).toBeTruthy();
  });
});
