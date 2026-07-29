import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CopilotHistorySearchModal } from "./CopilotHistorySearchModal";

const THREAD_A = "11111111-1111-4111-8111-111111111111";
const THREAD_B = "22222222-2222-4222-8222-222222222222";

const threads = [
  {
    id: THREAD_A,
    title: "Chart summary",
    schemaVersion: 1,
    syncRevision: 1,
    updatedAt: "2026-07-29T10:00:00.000Z",
    messageCount: 2,
  },
  {
    id: THREAD_B,
    title: "Portfolio review",
    schemaVersion: 1,
    syncRevision: 1,
    updatedAt: "2026-07-28T10:00:00.000Z",
    messageCount: 2,
  },
];

describe("CopilotHistorySearchModal", () => {
  it("lists all threads when query is empty", () => {
    render(
      <CopilotHistorySearchModal
        open
        threads={threads}
        activeThreadId={THREAD_A}
        onClose={vi.fn()}
        onSelectThread={vi.fn()}
        onNewChat={vi.fn()}
      />,
    );

    expect(screen.getByTestId(`copilot-history-search-result-${THREAD_A}`)).toBeTruthy();
    expect(screen.getByTestId(`copilot-history-search-result-${THREAD_B}`)).toBeTruthy();
    expect(screen.getByTestId("copilot-history-search-preview")).toHaveTextContent(
      "Chart summary",
    );
  });

  it("filters threads by title", () => {
    render(
      <CopilotHistorySearchModal
        open
        threads={threads}
        activeThreadId={THREAD_A}
        onClose={vi.fn()}
        onSelectThread={vi.fn()}
        onNewChat={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId("copilot-history-search-input"), {
      target: { value: "portfolio" },
    });

    expect(screen.getByTestId(`copilot-history-search-result-${THREAD_B}`)).toBeTruthy();
    expect(screen.queryByTestId(`copilot-history-search-result-${THREAD_A}`)).toBeNull();
  });

  it("selects a thread and closes via handler", () => {
    const onSelectThread = vi.fn();
    const onClose = vi.fn();

    render(
      <CopilotHistorySearchModal
        open
        threads={threads}
        activeThreadId={THREAD_A}
        onClose={onClose}
        onSelectThread={onSelectThread}
        onNewChat={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId(`copilot-history-search-result-${THREAD_B}`));
    expect(onSelectThread).toHaveBeenCalledWith(THREAD_B);
  });
});
