import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import * as lastModule from "@/lib/app/lastModule";

import DensitySwitcher from "./DensitySwitcher";

const routerPush = vi.fn();
const routerPrefetch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    prefetch: routerPrefetch,
  }),
  usePathname: vi.fn(() => "/copilot"),
}));

const { usePathname } = await import("next/navigation");

describe("DensitySwitcher", () => {
  beforeEach(() => {
    routerPush.mockReset();
    routerPrefetch.mockReset();
    vi.spyOn(lastModule, "recordLastModule").mockImplementation(() => {});
    vi.mocked(usePathname).mockReturnValue("/copilot");
  });

  it("renders Talk/Board/Desk segments on density routes", () => {
    render(<DensitySwitcher />);
    expect(screen.getByTestId("density-switcher")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Talk" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Board" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Desk" })).toBeTruthy();
  });

  it("prefetches other density routes on mount", () => {
    render(<DensitySwitcher />);
    expect(routerPrefetch).toHaveBeenCalledWith("/research");
    expect(routerPrefetch).toHaveBeenCalledWith("/workspace");
    expect(routerPrefetch).not.toHaveBeenCalledWith("/copilot");
  });

  it("navigates to Desk and records workspace lastModule", () => {
    render(<DensitySwitcher />);
    fireEvent.click(screen.getByRole("tab", { name: "Desk" }));
    expect(lastModule.recordLastModule).toHaveBeenCalledWith("workspace");
    expect(routerPush).toHaveBeenCalledWith("/workspace");
  });

  it("returns null on non-density routes", () => {
    vi.mocked(usePathname).mockReturnValue("/home");
    const { container } = render(<DensitySwitcher />);
    expect(container).toBeEmptyDOMElement();
  });
});
