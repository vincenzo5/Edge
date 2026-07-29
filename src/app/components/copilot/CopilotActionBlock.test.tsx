/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ActionChatBlock } from "@/lib/copilot/chatBlocks";
import { CopilotActionBlock } from "./CopilotActionBlock";

const sampleBlock: ActionChatBlock = {
  kind: "action",
  title: "Delete drawing",
  summary: "Confirm destructive action",
  primaryLabel: "Accept",
  secondaryLabel: "Reject",
  callId: "c2",
  name: "delete_drawing",
  confirmationToken: "tok_abc",
};

describe("CopilotActionBlock", () => {
  it("renders title, summary, and confirm buttons with stable testids", () => {
    render(
      <CopilotActionBlock
        block={sampleBlock}
        onPrimary={vi.fn()}
        onSecondary={vi.fn()}
      />,
    );

    expect(screen.getByTestId("copilot-action-block-c2")).toBeTruthy();
    expect(screen.getByText("Delete drawing")).toBeTruthy();
    expect(screen.getByText("Confirm destructive action")).toBeTruthy();
    expect(screen.getByTestId("copilot-confirm-accept-c2")).toBeTruthy();
    expect(screen.getByTestId("copilot-confirm-reject-c2")).toBeTruthy();
  });

  it("fires primary and secondary handlers", () => {
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();

    render(
      <CopilotActionBlock
        block={sampleBlock}
        onPrimary={onPrimary}
        onSecondary={onSecondary}
      />,
    );

    fireEvent.click(screen.getByTestId("copilot-confirm-accept-c2"));
    fireEvent.click(screen.getByTestId("copilot-confirm-reject-c2"));

    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it("disables buttons when disabled prop is set", () => {
    render(
      <CopilotActionBlock
        block={sampleBlock}
        onPrimary={vi.fn()}
        onSecondary={vi.fn()}
        disabled
      />,
    );

    expect(screen.getByTestId("copilot-confirm-accept-c2")).toBeDisabled();
    expect(screen.getByTestId("copilot-confirm-reject-c2")).toBeDisabled();
  });

  it("falls back to name for testids when callId is absent", () => {
    const block: ActionChatBlock = {
      kind: "action",
      title: "Place order",
      summary: "Review order",
      primaryLabel: "Accept",
      secondaryLabel: "Reject",
      name: "place_order",
    };

    render(
      <CopilotActionBlock block={block} onPrimary={vi.fn()} onSecondary={vi.fn()} />,
    );

    expect(screen.getByTestId("copilot-confirm-accept-place_order")).toBeTruthy();
    expect(screen.getByTestId("copilot-confirm-reject-place_order")).toBeTruthy();
  });
});
