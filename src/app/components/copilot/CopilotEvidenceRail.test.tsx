import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearResearchEvidenceForTests, pinEvidenceCard } from "@/lib/research/evidenceStore";
import { researchCardFromHint } from "@/lib/research/cardFromHint";
import { CopilotEvidenceRail } from "./CopilotEvidenceRail";

describe("CopilotEvidenceRail", () => {
  beforeEach(() => {
    clearResearchEvidenceForTests();
  });

  it("shows empty state when no cards are pinned", () => {
    render(<CopilotEvidenceRail onOpenHref={vi.fn()} />);
    expect(screen.getByTestId("copilot-evidence-empty")).toBeTruthy();
    expect(screen.getByText("Pinned")).toBeTruthy();
  });

  it("lists pinned cards with open and unpin actions", () => {
    const card = researchCardFromHint(
      { type: "chart", symbol: "NVDA", interval: "5", title: "NVDA · 5" },
      { threadId: "t1", messageId: "m1" },
    );
    pinEvidenceCard(card);

    const onOpenHref = vi.fn();
    render(<CopilotEvidenceRail onOpenHref={onOpenHref} />);

    expect(screen.getByTestId(`research-evidence-card-${card.id}`)).toBeTruthy();
    fireEvent.click(screen.getByTestId(`research-evidence-open-${card.id}`));
    expect(onOpenHref).toHaveBeenCalledWith("/chart?symbol=NVDA&interval=5");

    fireEvent.click(screen.getByTestId(`research-evidence-unpin-${card.id}`));
    expect(screen.getByTestId("copilot-evidence-empty")).toBeTruthy();
  });
});
