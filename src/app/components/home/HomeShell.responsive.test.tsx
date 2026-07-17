import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HomeShell from "./HomeShell";

let mockWidth = 2560;

vi.mock("@/lib/responsive/useElementSize", () => ({
  useElementSize: () => {
    const ref = { current: null };
    return [ref, { width: mockWidth, height: 900 }] as const;
  },
}));

vi.mock("./useHomeWorkspaceSummaries", () => ({
  useHomeWorkspaceSummaries: () => ({
    summaries: [
      {
        id: "tab-1",
        title: "Default",
        symbol: "AAPL",
        layoutId: "n1-single",
        isActive: true,
      },
    ],
    activeSummary: {
      id: "tab-1",
      title: "Default",
      symbol: "AAPL",
      layoutId: "n1-single",
      isActive: true,
    },
    loaded: true,
  }),
}));

vi.mock("./ModuleRouteTracker", () => ({
  default: () => null,
}));

vi.mock("./AppTopHeader", () => ({
  default: () => <div data-testid="app-top-header" />,
}));

vi.mock("../AccountProvider", () => ({
  AccountProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../AccountAliasesProvider", () => ({
  AccountAliasesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("./HomeResearchPanel", () => ({
  default: () => <div data-testid="home-research-panel" />,
}));

describe("HomeShell responsive modes", () => {
  beforeEach(() => {
    mockWidth = 2560;
  });

  it("uses tri-pane layout at ultrawide widths", () => {
    render(<HomeShell />);
    expect(screen.getByTestId("home-shell")).toHaveAttribute("data-home-layout-mode", "tri-pane");
    expect(screen.getByTestId("home-research-panel")).toBeInTheDocument();
  });

  it("uses dual-stack layout at 1920px", () => {
    mockWidth = 1920;
    render(<HomeShell />);
    expect(screen.getByTestId("home-shell")).toHaveAttribute("data-home-layout-mode", "dual-stack");
  });

  it("uses dual-tabbed layout at 1440px", () => {
    mockWidth = 1440;
    render(<HomeShell />);
    expect(screen.getByTestId("home-shell")).toHaveAttribute("data-home-layout-mode", "dual-tabbed");
    expect(screen.getByRole("tab", { name: "Journal" })).toBeInTheDocument();
  });

  it("uses main-drawer layout at 1280px", () => {
    mockWidth = 1280;
    render(<HomeShell />);
    expect(screen.getByTestId("home-shell")).toHaveAttribute("data-home-layout-mode", "main-drawer");
    expect(screen.getByTestId("home-module-chip-journal")).toBeInTheDocument();
  });

  it("uses hub layout below 1024px", () => {
    mockWidth = 768;
    render(<HomeShell />);
    expect(screen.getByTestId("home-shell")).toHaveAttribute("data-home-layout-mode", "hub");
    expect(screen.getByTestId("home-hub-cards")).toBeInTheDocument();
  });
});
