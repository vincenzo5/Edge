import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import DensityModuleLayout from "./DensityModuleLayout";

vi.mock("./AppTopHeader", () => ({
  default: () => <div data-testid="app-top-header" />,
}));

vi.mock("./AppChromeProviders", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("./AppContextMenuProvider", () => ({
  AppContextMenuProvider: ({
    children,
    ...rest
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...rest}>{children}</div>,
}));

vi.mock("../AiSessionBridge", () => ({
  default: () => <div data-testid="ai-session-bridge" />,
}));

describe("DensityModuleLayout", () => {
  it("renders persistent header, session bridge, and body slot", () => {
    render(
      <DensityModuleLayout>
        <div data-testid="density-body">Talk body</div>
      </DensityModuleLayout>,
    );

    expect(screen.getByTestId("app-top-header")).toBeInTheDocument();
    expect(screen.getByTestId("ai-session-bridge")).toBeInTheDocument();
    expect(screen.getByTestId("density-body")).toBeInTheDocument();
  });
});
