import { describe, expect, it } from "vitest";

import {
  hintToBlockKind,
  hintToBlockSketch,
  isConfirmToolStep,
  toolNameToBlockKind,
  toolStepToActionBlock,
  toolStepToBlockKind,
} from "./chatBlockMapping";
import type { CopilotToolStep } from "./types";

describe("hintToBlockKind", () => {
  it("maps chart hints to reference", () => {
    expect(
      hintToBlockKind({ type: "chart", symbol: "AAPL", interval: "1D" }),
    ).toBe("reference");
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
  it("builds a reference chip for chart hints", () => {
    const sketch = hintToBlockSketch({
      type: "chart",
      symbol: "TSLA",
      interval: "D",
      title: "TSLA · D",
    });
    expect(sketch?.kind).toBe("reference");
    if (sketch?.kind === "reference") {
      expect(sketch.chips[0]?.label).toBe("TSLA · D");
      expect(sketch.chips[0]?.target).toEqual({
        type: "symbol-interval",
        symbol: "TSLA",
        interval: "D",
      });
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
