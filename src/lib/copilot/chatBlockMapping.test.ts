import { describe, expect, it } from "vitest";

import {
  attachmentToMediaBlock,
  actionSummaryRowsFromStep,
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

  it("maps researchProfile hints to data", () => {
    expect(
      hintToBlockKind({
        type: "researchProfile",
        jobId: "job_1",
        title: "Research profile",
      }),
    ).toBe("data");
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

  it("builds table data block for researchProfile hints", () => {
    const sketch = hintToBlockSketch({
      type: "researchProfile",
      jobId: "job_1",
      title: "Research profile",
      keyMetrics: { Symbols: 1, "Total bars": 40 },
      previewTable: {
        columns: ["Symbol", "Bars"],
        rows: [["AAPL", 40]],
      },
    });
    expect(sketch?.kind).toBe("data");
    if (sketch?.kind === "data") {
      expect(sketch.shape).toBe("table");
      expect(sketch.pinHint?.type).toBe("researchProfile");
    }
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
      confirmArguments: { drawingId: "d1", cellIndex: 0 },
    };

    const block = toolStepToActionBlock(step);
    expect(block).toEqual({
      kind: "action",
      title: "Delete drawing",
      summary: "Confirm delete",
      summaryRows: [
        { key: "Drawing ID", value: "d1" },
        { key: "Cell", value: "0" },
      ],
      primaryLabel: "Accept",
      secondaryLabel: "Reject",
      callId: "c1",
      name: "delete_drawing",
      confirmationToken: "tok_1",
      requiresClientSession: true,
      confirmArguments: { drawingId: "d1", cellIndex: 0 },
    });
  });

  it("maps place_order draft fields to summaryRows", () => {
    const block = toolStepToActionBlock({
      callId: "c-order",
      name: "place_order",
      status: "pending-confirm",
      confirmReason: "Submit this order?",
      confirmArguments: {
        draft: {
          symbol: "AAPL",
          side: "BUY",
          quantity: 10,
          orderType: "LMT",
          limitPrice: 190.5,
          tif: "DAY",
          environment: "paper",
        },
        idempotencyKey: "idem-1",
        previewIntentId: "intent-1",
      },
    });

    expect(block?.summaryRows).toEqual([
      { key: "Symbol", value: "AAPL" },
      { key: "Side", value: "BUY" },
      { key: "Qty", value: "10" },
      { key: "Type", value: "LMT" },
      { key: "Limit", value: "190.5" },
      { key: "TIF", value: "DAY" },
      { key: "Environment", value: "paper" },
    ]);
    expect(block?.summaryRows?.some((row) => row.key === "idempotencyKey")).toBe(false);
  });

  it("maps attach_playbook args to summaryRows", () => {
    const rows = actionSummaryRowsFromStep({
      callId: "c-pb",
      name: "attach_playbook",
      status: "pending-confirm",
      confirmArguments: {
        symbol: "TSLA",
        side: "BUY",
        templateId: "trail-stop-v1",
        environment: "paper",
        qty: 5,
        entryPrice: 250,
        initialStop: 240,
        liveConfirmation: "LIVE",
      },
    });

    expect(rows).toEqual([
      { key: "Symbol", value: "TSLA" },
      { key: "Side", value: "BUY" },
      { key: "Template", value: "trail-stop-v1" },
      { key: "Environment", value: "paper" },
      { key: "Qty", value: "5" },
      { key: "Entry", value: "250" },
      { key: "Stop", value: "240" },
    ]);
  });

  it("maps prepare_chart_for_analysis args to summaryRows", () => {
    const rows = actionSummaryRowsFromStep({
      callId: "c-prep",
      name: "prepare_chart_for_analysis",
      status: "pending-confirm",
      confirmArguments: { symbol: "NVDA", exchange: "NASDAQ" },
    });

    expect(rows).toEqual([
      { key: "Symbol", value: "NVDA" },
      { key: "Exchange", value: "NASDAQ" },
    ]);
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
