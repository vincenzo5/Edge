import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import HomeAppNav from "./HomeAppNav";
import * as lastModule from "@/lib/app/lastModule";
import { usePathname } from "next/navigation";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/home"),
}));

describe("HomeAppNav", () => {
  beforeEach(() => {
    vi.spyOn(lastModule, "recordLastModule").mockImplementation(() => {});
  });

  it("records home module when Home is clicked", () => {
    render(<HomeAppNav />);

    fireEvent.click(screen.getByTestId("home-nav-home"));
    expect(lastModule.recordLastModule).toHaveBeenCalledWith("home");
  });

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
