import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { CopilotHistoryRail } from "./CopilotHistoryRail";

const THREAD_A = "11111111-1111-4111-8111-111111111111";
const THREAD_B = "22222222-2222-4222-8222-222222222222";

const threads = [
  {
    id: THREAD_A,
    title: "Older thread",
    schemaVersion: 1,
    syncRevision: 1,
    updatedAt: "2026-07-28T10:00:00.000Z",
    messageCount: 2,
  },
  {
    id: THREAD_B,
    title: "Newer thread",
    schemaVersion: 1,
    syncRevision: 1,
    updatedAt: "2026-07-29T12:00:00.000Z",
    messageCount: 4,
  },
];

function renderRail(overrides: Partial<ComponentProps<typeof CopilotHistoryRail>> = {}) {
  return render(
    <CopilotHistoryRail
      threadId={THREAD_A}
      threads={threads}
      onNewChat={vi.fn()}
      onSwitchThread={vi.fn()}
      onDeleteThread={vi.fn()}
      onSearchOpen={vi.fn()}
      onSeeAll={vi.fn()}
      onRenameThread={vi.fn()}
      {...overrides}
    />,
  );
}

describe("CopilotHistoryRail", () => {
  it("lists threads newest first and highlights the active thread", () => {
    renderRail();

    const list = screen.getByTestId("copilot-history-list");
    const buttons = list.querySelectorAll("button[data-testid^='copilot-history-thread-']");
    expect(buttons[0]).toHaveAttribute("data-testid", `copilot-history-thread-${THREAD_B}`);
    expect(buttons[1]).toHaveAttribute("data-testid", `copilot-history-thread-${THREAD_A}`);
    expect(screen.getByTestId(`copilot-history-thread-${THREAD_A}`)).toHaveAttribute(
      "data-active",
      "true",
    );
  });

  it("groups threads under recency headers", () => {
    renderRail();
    expect(screen.getByTestId("copilot-history-group-yesterday")).toBeTruthy();
    expect(screen.getByTestId("copilot-history-group-today")).toBeTruthy();
  });

  it("calls thread actions from the rail", () => {
    const onNewChat = vi.fn();
    const onSwitchThread = vi.fn();
    const onDeleteThread = vi.fn();
    const onRenameThread = vi.fn();

    renderRail({
      onNewChat,
      onSwitchThread,
      onDeleteThread,
      onRenameThread,
    });

    fireEvent.click(screen.getByTestId("copilot-history-new-chat"));
    fireEvent.click(screen.getByTestId(`copilot-history-thread-${THREAD_B}`));
    fireEvent.click(screen.getByTestId(`copilot-history-menu-${THREAD_B}`));
    fireEvent.click(screen.getByTestId(`copilot-history-delete-${THREAD_B}`));
    fireEvent.click(screen.getByTestId(`copilot-history-menu-${THREAD_A}`));
    fireEvent.click(screen.getByTestId(`copilot-history-rename-${THREAD_A}`));

    expect(onNewChat).toHaveBeenCalledTimes(1);
    expect(onSwitchThread).toHaveBeenCalledWith(THREAD_B);
    expect(onDeleteThread).toHaveBeenCalledWith(THREAD_B);
    expect(onRenameThread).toHaveBeenCalledWith(THREAD_A);
  });

  it("opens search and see-all handlers", () => {
    const onSearchOpen = vi.fn();
    const onSeeAll = vi.fn();

    renderRail({ onSearchOpen, onSeeAll });

    fireEvent.click(screen.getByTestId("copilot-history-search"));
    fireEvent.click(screen.getByTestId("copilot-history-see-all"));

    expect(onSearchOpen).toHaveBeenCalledTimes(1);
    expect(onSeeAll).toHaveBeenCalledTimes(1);
  });

  it("collapses and expands the rail", () => {
    renderRail();

    fireEvent.click(screen.getByTestId("copilot-history-collapse"));
    expect(screen.getByTestId("copilot-history-rail")).toHaveAttribute("data-collapsed", "true");

    fireEvent.click(screen.getByTestId("copilot-history-expand"));
    expect(screen.getByTestId("copilot-history-rail")).toHaveAttribute("data-collapsed", "false");
  });
});
