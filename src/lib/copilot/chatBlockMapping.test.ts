import { describe, expect, it } from "vitest";

import {
  attachmentToMediaBlock,
  hintToBlockKind,
  hintToBlockSketch,
  isConfirmToolStep,
  toolNameToBlockKind,
  toolStepToActionBlock,
  toolStepToBlockKind,
  toolStepToDataBlock,
  toolStepToMediaBlock,
  toolStepsToReferenceBlock,
  referenceTargetHref,
  workflowPromptsToFollowupsBlock,
} from "./chatBlockMapping";
import { COPILOT_WORKFLOW_PROMPTS } from "@/lib/ai/agent/promptLibrary";
import type { CopilotToolStep } from "./types";

describe("hintToBlockKind", () => {
  it("maps chart hints to media", () => {
    expect(
      hintToBlockKind({ type: "chart", symbol: "AAPL", interval: "1D" }),
    ).toBe("media");
  });

  it("maps screener and journal hints to data", () => {
    expect(hintToBlockKind({ type: "screener", title: "Gainers" })).toBe("data");
    expect(
      hintToBlockKind({ type: "journalDraft", summary: "3 trades" }),
    ).toBe("data");
  });

  it("returns null for note and aiCallout (prefer markdown)", () => {
    expect(hintToBlockKind({ type: "note", body: "Takeaway" })).toBeNull();
    expect(hintToBlockKind({ type: "aiCallout", summary: "Headline" })).toBeNull();
  });
});

describe("hintToBlockSketch", () => {
  it("builds a media block for chart hints", () => {
    const sketch = hintToBlockSketch({
      type: "chart",
      symbol: "TSLA",
      interval: "D",
      title: "TSLA · D",
    });
    expect(sketch?.kind).toBe("media");
    if (sketch?.kind === "media") {
      expect(sketch.caption).toBe("TSLA · D");
      expect(sketch.openLabel).toBe("Open");
      expect(sketch.openHref).toBe("/chart?symbol=TSLA&interval=D");
      expect(sketch.pinHint?.type).toBe("chart");
    }
  });

  it("builds a kv data block for screener hints", () => {
    const sketch = hintToBlockSketch({
      type: "screener",
      queryLabel: "Tech momentum",
      title: "Screener results",
    });
    expect(sketch?.kind).toBe("data");
    if (sketch?.kind === "data") {
      expect(sketch.shape).toBe("kv");
      expect(sketch.pinHint?.type).toBe("screener");
    }
  });

  it("returns null for note hints", () => {
    expect(hintToBlockSketch({ type: "note", body: "Body text" })).toBeNull();
  });
});

describe("attachmentToMediaBlock", () => {
  it("maps user attachments to media blocks with open href", () => {
    const block = attachmentToMediaBlock({
      id: "att-1",
      mimeType: "image/png",
      name: "chart.png",
    });

    expect(block.kind).toBe("media");
    expect(block.src).toContain("att-1");
    expect(block.mimeType).toBe("image/png");
    expect(block.caption).toBe("chart.png");
    expect(block.openHref).toBe(block.src);
  });
});

describe("toolStepToMediaBlock", () => {
  it("returns media blocks for chart artifact steps", () => {
    const block = toolStepToMediaBlock({
      callId: "c1",
      name: "get_chart_state",
      status: "done",
      artifactHint: { type: "chart", symbol: "AAPL", interval: "1D" },
    });

    expect(block?.kind).toBe("media");
    expect(block?.pinHint?.type).toBe("chart");
  });
});

describe("toolStepToDataBlock", () => {
  it("returns data blocks for screener artifact steps", () => {
    const block = toolStepToDataBlock({
      callId: "c2",
      name: "summarize_screen",
      status: "done",
      artifactHint: { type: "screener", title: "Gainers" },
    });

    expect(block?.kind).toBe("data");
    expect(block?.shape).toBe("kv");
    expect(block?.pinHint?.type).toBe("screener");
  });
});

describe("toolNameToBlockKind", () => {
  it("maps high-traffic tools to expected kinds", () => {
    expect(toolNameToBlockKind("summarize_screen")).toBe("data");
    expect(toolNameToBlockKind("get_chart_state")).toBe("reference");
    expect(toolNameToBlockKind("set_symbol")).toBe("reference");
    expect(toolNameToBlockKind("list_journal_trades")).toBe("data");
    expect(toolNameToBlockKind("preview_order")).toBe("action");
    expect(toolNameToBlockKind("place_order")).toBe("action");
    expect(toolNameToBlockKind("delete_drawing")).toBe("action");
  });

  it("defaults unknown tools to trace", () => {
    expect(toolNameToBlockKind("get_candles")).toBe("trace");
  });
});

describe("toolStepToBlockKind", () => {
  it("maps pending confirm steps to action", () => {
    const step: CopilotToolStep = {
      callId: "c1",
      name: "delete_drawing",
      status: "pending-confirm",
      confirmReason: "Confirm delete",
    };
    expect(isConfirmToolStep(step)).toBe(true);
    expect(toolStepToBlockKind(step)).toBe("action");
  });

  it("prefers hint kind over tool default", () => {
    const step: CopilotToolStep = {
      callId: "c2",
      name: "summarize_screen",
      status: "done",
      artifactHint: { type: "screener", title: "Results" },
    };
    expect(toolStepToBlockKind(step)).toBe("data");
  });
});

describe("toolStepToActionBlock", () => {
  it("maps pending-confirm steps to Action blocks", () => {
    const step: CopilotToolStep = {
      callId: "c1",
      name: "delete_drawing",
      status: "pending-confirm",
      confirmReason: "Confirm delete",
      confirmationToken: "tok_1",
      requiresClientSession: true,
      confirmArguments: { id: "d1" },
    };

    const block = toolStepToActionBlock(step);
    expect(block).toEqual({
      kind: "action",
      title: "Delete drawing",
      summary: "Confirm delete",
      primaryLabel: "Accept",
      secondaryLabel: "Reject",
      callId: "c1",
      name: "delete_drawing",
      confirmationToken: "tok_1",
      requiresClientSession: true,
      confirmArguments: { id: "d1" },
    });
  });

  it("uses step summary when confirmReason is absent", () => {
    const block = toolStepToActionBlock({
      callId: "c2",
      name: "preview_order",
      status: "pending-confirm",
      summary: "Review order details",
    });

    expect(block?.summary).toBe("Review order details");
    expect(block?.title).toBe("Preview order");
  });

  it("returns null for non-confirm steps", () => {
    expect(
      toolStepToActionBlock({
        callId: "c3",
        name: "delete_drawing",
        status: "done",
      }),
    ).toBeNull();
  });
});

describe("toolStepsToReferenceBlock", () => {
  it("builds chips from chart artifact hints", () => {
    const block = toolStepsToReferenceBlock([
      {
        callId: "c1",
        name: "get_chart_state",
        status: "done",
        artifactHint: { type: "chart", symbol: "AAPL", interval: "1D" },
      },
    ]);

    expect(block?.kind).toBe("reference");
    expect(block?.chips).toEqual([
      {
        id: "c1-chart",
        label: "AAPL · 1D",
        target: { type: "symbol-interval", symbol: "AAPL", interval: "1D" },
      },
    ]);
  });

  it("parses reference tool summaries without hints", () => {
    const block = toolStepsToReferenceBlock([
      {
        callId: "c2",
        name: "set_symbol",
        status: "done",
        summary: "Switched to NVDA",
      },
    ]);

    expect(block?.chips[0]).toEqual({
      id: "c2-ref",
      label: "NVDA · D",
      target: { type: "symbol-interval", symbol: "NVDA", interval: "D" },
    });
  });

  it("dedupes chips by symbol and interval", () => {
    const block = toolStepsToReferenceBlock([
      {
        callId: "c1",
        name: "get_chart_state",
        status: "done",
        artifactHint: { type: "chart", symbol: "AAPL", interval: "1D" },
      },
      {
        callId: "c2",
        name: "set_symbol",
        status: "done",
        summary: "AAPL · 1D",
      },
    ]);

    expect(block?.chips).toHaveLength(1);
  });

  it("ignores running and non-reference tools", () => {
    expect(
      toolStepsToReferenceBlock([
        {
          callId: "c1",
          name: "get_chart_state",
          status: "running",
          artifactHint: { type: "chart", symbol: "AAPL", interval: "1D" },
        },
        {
          callId: "c2",
          name: "summarize_screen",
          status: "done",
          artifactHint: { type: "screener", title: "Gainers" },
        },
      ]),
    ).toBeNull();
  });
});

describe("referenceTargetHref", () => {
  it("maps symbol-interval targets to chart hrefs", () => {
    expect(
      referenceTargetHref({ type: "symbol-interval", symbol: "TSLA", interval: "5" }),
    ).toBe("/chart?symbol=TSLA&interval=5");
  });
});

describe("workflowPromptsToFollowupsBlock", () => {
  it("maps curated workflow prompts to follow-up chips", () => {
    const block = workflowPromptsToFollowupsBlock();

    expect(block.kind).toBe("followups");
    expect(block.chips).toHaveLength(COPILOT_WORKFLOW_PROMPTS.length);
    expect(block.chips[0]).toEqual({
      id: "prepare_analysis",
      label: "Prepare chart for analysis",
      prompt: COPILOT_WORKFLOW_PROMPTS[0]!.prompt,
    });
  });
});
