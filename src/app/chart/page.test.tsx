import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ChartPage from "../chart/page";

vi.mock("../components/StockApp", () => ({
  default: () => <div data-testid="stock-app" />,
}));

vi.mock("../components/home/ModuleRouteTracker", () => ({
  default: ({ module }: { module: string }) => (
    <div data-testid="module-route-tracker" data-module={module} />
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/chart"),
  useSearchParams: () => new URLSearchParams(),
}));

describe("ChartPage", () => {
  it("renders StockApp with persistent app nav and records chart module", () => {
    render(<ChartPage />);
    expect(screen.getByTestId("chart-page")).toBeInTheDocument();
    expect(screen.getByTestId("home-app-nav")).toBeInTheDocument();
    expect(screen.getByTestId("stock-app")).toBeInTheDocument();
    expect(screen.getByTestId("module-route-tracker")).toHaveAttribute("data-module", "chart");
  });
});
