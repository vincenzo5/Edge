/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CopilotFollowupsBlock } from "./CopilotFollowupsBlock";

describe("CopilotFollowupsBlock", () => {
  it("sends full prompt via onSelect when a chip is clicked", () => {
    const onSelect = vi.fn();
    render(
      <CopilotFollowupsBlock
        block={{
          kind: "followups",
          chips: [
            {
              id: "prepare_analysis",
              label: "Prepare chart for analysis",
              prompt: "Prepare the active symbol for analysis: load it on a 1Y daily chart.",
            },
          ],
        }}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByTestId("copilot-followup-chip-prepare_analysis"));
    expect(onSelect).toHaveBeenCalledWith(
      "Prepare the active symbol for analysis: load it on a 1Y daily chart.",
    );
  });

  it("shows label when present and falls back to prompt", () => {
    render(
      <CopilotFollowupsBlock
        block={{
          kind: "followups",
          chips: [
            { id: "labeled", label: "Short label", prompt: "Long prompt text" },
            { id: "unlabeled", prompt: "Prompt only" },
          ],
        }}
      />,
    );

    expect(screen.getByTestId("copilot-followup-chip-labeled")).toHaveTextContent("Short label");
    expect(screen.getByTestId("copilot-followup-chip-unlabeled")).toHaveTextContent("Prompt only");
  });

  it("disables chip clicks when disabled", () => {
    const onSelect = vi.fn();
    render(
      <CopilotFollowupsBlock
        block={{
          kind: "followups",
          chips: [{ id: "f1", label: "Follow up", prompt: "Next question" }],
        }}
        onSelect={onSelect}
        disabled
      />,
    );

    const chip = screen.getByTestId("copilot-followup-chip-f1");
    expect(chip.tagName).toBe("BUTTON");
    expect(chip).toBeDisabled();
    fireEvent.click(chip);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("renders a Follow-ups section label when showLabel is true", () => {
    render(
      <CopilotFollowupsBlock
        block={{
          kind: "followups",
          chips: [{ id: "f1", label: "Next", prompt: "Next question" }],
        }}
        showLabel
      />,
    );

    expect(screen.getByText("Follow-ups")).toBeTruthy();
  });
});
