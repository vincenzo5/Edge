import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import HomeAppNav from "./HomeAppNav";
import { usePathname } from "next/navigation";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/home"),
}));

describe("HomeAppNav", () => {
  it("links charts nav to /chart", () => {
    render(<HomeAppNav />);
    expect(screen.getByTestId("home-nav-chart")).toHaveAttribute("href", "/chart");
  });

  it("uses the slim icon rail width shared with chart toolbars", () => {
    render(<HomeAppNav />);
    expect(screen.getByTestId("home-app-nav")).toHaveStyle({ width: "44px" });
  });

  it("highlights journal nav on journal sub-routes", () => {
    vi.mocked(usePathname).mockReturnValue("/journal/trades");
    render(<HomeAppNav />);
    expect(screen.getByTestId("home-nav-journal")).toHaveAttribute("aria-current", "page");
  });
});
