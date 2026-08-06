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
      onRenameThread={vi.fn()}
      {...overrides}
    />,
  );
}

describe("CopilotHistoryRail", () => {
  it("places Copilot title and collapse above search and new chat", () => {
    renderRail();

    const rail = screen.getByTestId("copilot-history-rail");
    const title = screen.getByTestId("copilot-history-title");
    const collapse = screen.getByTestId("copilot-history-collapse");
    const search = screen.getByTestId("copilot-history-search");
    const newChat = screen.getByTestId("copilot-history-new-chat");

    expect(title).toHaveTextContent("Copilot");
    expect(title.className).toContain("font-bold");
    expect(title.className).toContain("px-3");
    expect(title.parentElement?.className).toContain("justify-between");
    expect(
      title.compareDocumentPosition(collapse) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      collapse.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      search.compareDocumentPosition(newChat) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(rail.contains(title)).toBe(true);
  });

  it("styles search and new chat as transparent nav rows until hover", () => {
    renderRail();

    const search = screen.getByTestId("copilot-history-search");
    const newChat = screen.getByTestId("copilot-history-new-chat");

    expect(search).toHaveTextContent("Search");
    expect(newChat).toHaveTextContent("New Chat");
    expect(search.className).toContain("copilot-history-nav-btn");
    expect(newChat.className).toContain("copilot-history-nav-btn");
    expect(search.className).not.toContain("copilot-history-new-chat-btn");
    expect(newChat.className).not.toContain("copilot-history-new-chat-btn");
  });

  it("uses pointer cursor on enabled history rail controls", () => {
    renderRail();

    const search = screen.getByTestId("copilot-history-search");
    const newChat = screen.getByTestId("copilot-history-new-chat");
    const collapse = screen.getByTestId("copilot-history-collapse");
    const sectionToggle = screen.getByTestId("copilot-history-section-toggle");
    const inactiveThread = screen.getByTestId(`copilot-history-thread-${THREAD_B}`);
    const activeThread = screen.getByTestId(`copilot-history-thread-${THREAD_A}`);
    const seeAll = screen.getByTestId("copilot-history-see-all");
    const menu = screen.getByTestId(`copilot-history-menu-${THREAD_B}`);

    for (const control of [search, newChat, collapse, sectionToggle, inactiveThread, seeAll, menu]) {
      expect(control.className).toContain("cursor-pointer");
    }
    expect(search.className).toContain("disabled:cursor-not-allowed");
    expect(activeThread.className).toContain("disabled:cursor-default");
  });

  it("styles thread rows with the same nav row treatment as search and new chat", () => {
    renderRail();

    const search = screen.getByTestId("copilot-history-search");
    const activeThread = screen.getByTestId(`copilot-history-thread-${THREAD_A}`);
    const inactiveThread = screen.getByTestId(`copilot-history-thread-${THREAD_B}`);
    const activeRow = activeThread.parentElement;
    const inactiveRow = inactiveThread.parentElement;

    expect(activeRow?.className).toContain("copilot-history-thread-row");
    expect(activeRow?.className).toContain("is-active");
    expect(inactiveRow?.className).toContain("copilot-history-thread-row");
    expect(inactiveRow?.className).not.toContain("is-active");
    expect(activeThread.className).not.toContain("text-sm");
    expect(inactiveThread.className).not.toContain("text-sm");
    expect(search.className).toContain("copilot-history-nav-btn");
    expect(getComputedStyle(search).minHeight).toBe(getComputedStyle(activeRow!).minHeight);
  });

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

  it("opens search from search and see-all rows", () => {
    const onSearchOpen = vi.fn();

    renderRail({ onSearchOpen });

    fireEvent.click(screen.getByTestId("copilot-history-search"));
    fireEvent.click(screen.getByTestId("copilot-history-see-all"));

    expect(onSearchOpen).toHaveBeenCalledTimes(2);
  });

  it("places muted see-all as the last element inside the history list", () => {
    renderRail();

    const list = screen.getByTestId("copilot-history-list");
    const seeAll = screen.getByTestId("copilot-history-see-all");
    const children = Array.from(list.children);

    expect(list.contains(seeAll)).toBe(true);
    expect(children[children.length - 1]).toBe(seeAll);
    expect(seeAll).toHaveTextContent("See all");
    expect(seeAll.className).toContain("text-[var(--edge-text-muted)]");
    expect(seeAll.className).toContain("hover:text-[var(--edge-text-primary)]");
    expect(seeAll.className).not.toContain("hover:bg-");
    expect(seeAll.className).toContain("mt-0.5");
    expect(seeAll.parentElement?.className).not.toContain("border-t");
  });

  it("collapses and expands the rail", () => {
    renderRail();

    fireEvent.click(screen.getByTestId("copilot-history-collapse"));
    expect(screen.getByTestId("copilot-history-rail")).toHaveAttribute("data-collapsed", "true");

    fireEvent.click(screen.getByTestId("copilot-history-expand"));
    expect(screen.getByTestId("copilot-history-rail")).toHaveAttribute("data-collapsed", "false");
  });

  it("collapses and expands the history section", () => {
    renderRail();

    const toggle = screen.getByTestId("copilot-history-section-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("copilot-history-list")).toBeTruthy();
    expect(screen.getByTestId("copilot-history-see-all")).toBeTruthy();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("copilot-history-list")).toBeNull();
    expect(screen.queryByTestId("copilot-history-see-all")).toBeNull();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("copilot-history-list")).toBeTruthy();
  });
});
