import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppModuleShell from "./AppModuleShell";

vi.mock("./AppTopHeader", () => ({
  default: () => <div data-testid="app-top-header" />,
}));

vi.mock("../AccountProvider", () => ({
  AccountProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../AccountAliasesProvider", () => ({
  AccountAliasesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("AppModuleShell", () => {
  it("renders top header and viewport-bounded shell without side nav", () => {
    render(
      <AppModuleShell testId="test-shell">
        <div data-testid="shell-content">Content</div>
      </AppModuleShell>,
    );

    expect(screen.queryByTestId("home-app-nav")).not.toBeInTheDocument();
    expect(screen.getByTestId("app-top-header")).toBeInTheDocument();
    expect(screen.getByTestId("test-shell")).toHaveClass("h-screen", "overflow-hidden");
    expect(screen.getByTestId("shell-content")).toBeInTheDocument();
  });
});
