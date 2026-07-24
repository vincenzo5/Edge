import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ResearchBoardSessionRail from "./ResearchBoardSessionRail";

const SESSION_A = "11111111-1111-4111-8111-111111111111";
const SESSION_B = "22222222-2222-4222-8222-222222222222";

describe("ResearchBoardSessionRail", () => {
  it("lists sessions and switches active session", () => {
    const onSwitchSession = vi.fn();
    render(
      <ResearchBoardSessionRail
        sessionId={SESSION_A}
        sessions={[
          {
            id: SESSION_A,
            title: "First board",
            schemaVersion: 1,
            syncRevision: 1,
            updatedAt: "2026-01-02T00:00:00.000Z",
            cardCount: 2,
            linkCount: 1,
          },
          {
            id: SESSION_B,
            title: "Second board",
            schemaVersion: 1,
            syncRevision: 1,
            updatedAt: "2026-01-01T00:00:00.000Z",
            cardCount: 0,
            linkCount: 0,
          },
        ]}
        primaryThreadId="thread-1"
        onNewSession={vi.fn()}
        onSwitchSession={onSwitchSession}
        onRenameSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onOpenTalk={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId(`research-session-item-${SESSION_B}`).querySelector("button")!);
    expect(onSwitchSession).toHaveBeenCalledWith(SESSION_B);
  });

  it("opens Talk when linked thread exists", () => {
    const onOpenTalk = vi.fn();
    render(
      <ResearchBoardSessionRail
        sessionId={SESSION_A}
        sessions={[
          {
            id: SESSION_A,
            title: "First board",
            schemaVersion: 1,
            syncRevision: 1,
            updatedAt: "2026-01-02T00:00:00.000Z",
            cardCount: 1,
            linkCount: 0,
          },
        ]}
        primaryThreadId="thread-abc"
        onNewSession={vi.fn()}
        onSwitchSession={vi.fn()}
        onRenameSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onOpenTalk={onOpenTalk}
      />,
    );

    fireEvent.click(screen.getByTestId("research-session-open-talk"));
    expect(onOpenTalk).toHaveBeenCalledWith("thread-abc");
  });
});
