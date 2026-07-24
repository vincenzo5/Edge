import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearResearchBoardSessionForTests } from "@/lib/research/boardSessionStore";

import ResearchBoard from "./ResearchBoard";

vi.mock("../home/ModuleRouteTracker", () => ({
  default: () => null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/persistence/client/researchSessionsClient", () => ({
  hydrateResearchSessionsState: vi.fn(async () => ({
    activeSessionId: "11111111-1111-4111-8111-111111111111",
    sessions: [],
    syncRevision: 1,
    title: "Research session",
  })),
  saveResearchSessionState: vi.fn(async () => ({ syncRevision: 1, title: "Research session" })),
  createResearchSessionState: vi.fn(async () => ({
    sessionId: "22222222-2222-4222-8222-222222222222",
    syncRevision: 1,
    title: "Research session",
  })),
  switchResearchSessionState: vi.fn(async () => undefined),
  renameResearchSessionState: vi.fn(async () => ({ syncRevision: 1, title: "Renamed" })),
  deleteResearchSessionState: vi.fn(async () => undefined),
}));

describe("ResearchBoard", () => {
  beforeEach(() => {
    clearResearchBoardSessionForTests();
  });

  it("frames Board density with empty state CTAs", () => {
    render(<ResearchBoard />);
    expect(screen.getByTestId("research-board-page")).toBeTruthy();
    expect(screen.getByTestId("research-session-rail")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Research session" })).toBeTruthy();
    expect(screen.getByTestId("research-board-empty")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Talk" })).toHaveAttribute("href", "/copilot");
    expect(screen.getByRole("link", { name: "Open Desk" })).toHaveAttribute("href", "/workspace");
  });
});
