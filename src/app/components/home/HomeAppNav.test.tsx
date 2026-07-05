import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import HomeAppNav from "./HomeAppNav";
import * as lastModule from "@/lib/app/lastModule";

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
});
