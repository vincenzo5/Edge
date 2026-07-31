import { describe, expect, it } from "vitest";
import type { CopilotToolStep } from "@/lib/copilot/types";
import {
  formatStepsDisclosureLabel,
  formatTraceChipSummary,
  formatTraceDisclosureLabel,
  toolStepDisplayName,
  toolStepKind,
  toolStepTargetLabel,
} from "./toolStepDisplay";

describe("toolStepDisplayName", () => {
  it("maps common tools to short labels", () => {
    expect(toolStepDisplayName("get_app_state")).toBe("Workspace");
    expect(toolStepDisplayName("get_candles")).toBe("Candles");
    expect(toolStepDisplayName("search_symbols")).toBe("Symbol search");
  });

  it("title-cases unknown snake_case tools", () => {
    expect(toolStepDisplayName("custom_tool_name")).toBe("Custom Tool Name");
  });
});

describe("toolStepKind", () => {
  it("classifies tools into trace icon kinds", () => {
    expect(toolStepKind({ name: "get_chart_state" })).toBe("chart");
    expect(toolStepKind({ name: "add_drawing" })).toBe("write");
    expect(toolStepKind({ name: "go_to_date" })).toBe("chart");
    expect(toolStepKind({ name: "place_order" })).toBe("order");
    expect(toolStepKind({ name: "search_symbols" })).toBe("search");
  });
});

describe("toolStepTargetLabel", () => {
  it("extracts chart hint symbol and interval", () => {
    const step: CopilotToolStep = {
      callId: "c1",
      name: "get_chart_state",
      status: "done",
      artifactHint: { type: "chart", symbol: "CSCO", interval: "1d" },
    };
    expect(toolStepTargetLabel(step)).toBe("CSCO · 1d");
  });

  it("extracts symbol from confirm arguments", () => {
    const step: CopilotToolStep = {
      callId: "c2",
      name: "set_symbol",
      status: "done",
      confirmArguments: { symbol: "NVDA", interval: "5" },
    };
    expect(toolStepTargetLabel(step)).toBe("NVDA · 5");
  });

  it("uses concise summaries as targets", () => {
    const step: CopilotToolStep = {
      callId: "c3",
      name: "search_symbols",
      status: "done",
      summary: "1 symbol",
    };
    expect(toolStepTargetLabel(step)).toBe("1 symbol");
  });
});

describe("formatTraceDisclosureLabel", () => {
  it("shows thinking while running", () => {
    expect(formatTraceDisclosureLabel({ stepCount: 1, hasRunning: true })).toBe("Thinking");
    expect(formatTraceDisclosureLabel({ stepCount: 3, hasRunning: true })).toBe("Thinking · 3");
  });

  it("shows thought duration when complete", () => {
    expect(
      formatTraceDisclosureLabel({ stepCount: 2, hasRunning: false, durationSec: 4 }),
    ).toBe("Thought for 4s");
  });

  it("falls back to tool count without duration", () => {
    expect(formatTraceDisclosureLabel({ stepCount: 1, hasRunning: false })).toBe("1 tool");
    expect(formatTraceDisclosureLabel({ stepCount: 3, hasRunning: false })).toBe("3 tools");
  });
});

describe("formatStepsDisclosureLabel", () => {
  it("delegates to formatTraceDisclosureLabel without duration", () => {
    expect(formatStepsDisclosureLabel(3, false)).toBe("3 tools");
    expect(formatStepsDisclosureLabel(2, true)).toBe("Thinking · 2");
  });

  it("returns bare label when count is zero", () => {
    expect(formatStepsDisclosureLabel(0, false)).toBe("Thinking");
  });
});

describe("formatTraceChipSummary", () => {
  it("summarizes multi-step traces", () => {
    expect(formatTraceChipSummary(1)).toBeNull();
    expect(formatTraceChipSummary(4)).toBe("4 tool calls");
  });
});
