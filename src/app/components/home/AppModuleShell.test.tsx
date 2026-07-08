import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppModuleShell from "./AppModuleShell";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/home"),
}));

describe("AppModuleShell", () => {
  it("renders app nav and viewport-bounded shell", () => {
    render(
      <AppModuleShell testId="test-shell">
        <div data-testid="shell-content">Content</div>
      </AppModuleShell>,
    );

    expect(screen.getByTestId("home-app-nav")).toBeInTheDocument();
    expect(screen.getByTestId("test-shell")).toHaveClass("h-screen", "overflow-hidden");
    expect(screen.getByTestId("shell-content")).toBeInTheDocument();
  });
});
