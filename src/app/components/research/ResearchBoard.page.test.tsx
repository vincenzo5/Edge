import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearResearchBoardSessionForTests } from "@/lib/research/boardSessionStore";

import ResearchBoard from "./ResearchBoard";

vi.mock("../home/AppModuleShell", () => ({
  default: ({
    children,
    testId,
  }: {
    children: React.ReactNode;
    testId?: string;
  }) => <div data-testid={testId}>{children}</div>,
}));

vi.mock("../home/ModuleRouteTracker", () => ({
  default: () => null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("ResearchBoard", () => {
  beforeEach(() => {
    clearResearchBoardSessionForTests();
  });

  it("frames Board density with empty state CTAs", () => {
    render(<ResearchBoard />);
    expect(screen.getByTestId("research-board-page")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Board" })).toBeTruthy();
    expect(screen.getByTestId("research-board-empty")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Talk" })).toHaveAttribute("href", "/copilot");
    expect(screen.getByRole("link", { name: "Open Desk" })).toHaveAttribute("href", "/workspace");
  });
});
