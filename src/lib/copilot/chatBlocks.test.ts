import { describe, expect, it } from "vitest";

import {
  CHAT_BLOCK_MAX_DATA_ROWS,
  CHAT_BLOCK_MAX_FOLLOWUPS,
  parseChatBlock,
  parseChatBlocks,
} from "./chatBlocks";

describe("parseChatBlock", () => {
  it("round-trips trace blocks", () => {
    const block = {
      kind: "trace" as const,
      steps: [
        {
          callId: "c1",
          name: "get_chart_state",
          status: "done" as const,
          summary: "Chart state loaded",
        },
      ],
    };
    expect(parseChatBlock(block)).toEqual(block);
  });

  it("round-trips media blocks with image src", () => {
    const block = {
      kind: "media" as const,
      src: "https://example.com/chart.png",
      mimeType: "image/png" as const,
      caption: "AAPL daily",
      openLabel: "Open",
    };
    expect(parseChatBlock(block)).toEqual(block);
  });

  it("round-trips caption-only media blocks with pinHint", () => {
    const block = {
      kind: "media" as const,
      caption: "AAPL · 1D",
      openLabel: "Open",
      openHref: "/chart?symbol=AAPL&interval=1D",
      pinHint: {
        type: "chart" as const,
        symbol: "AAPL",
        interval: "1D",
      },
    };
    expect(parseChatBlock(block)).toEqual(block);
  });

  it("rejects media blocks without src, caption, or pinHint", () => {
    expect(() =>
      parseChatBlock({
        kind: "media",
        openLabel: "Open",
      }),
    ).toThrow();
  });

  it("round-trips data table blocks with pinHint", () => {
    const block = {
      kind: "data" as const,
      shape: "table" as const,
      title: "Screener",
      columns: [{ id: "symbol", label: "Symbol" }],
      rows: [{ symbol: "AAPL" }],
      pinHint: {
        type: "screener" as const,
        title: "Screener results",
      },
    };
    expect(parseChatBlock(block)).toEqual(block);
  });

  it("round-trips data kv blocks", () => {
    const block = {
      kind: "data" as const,
      shape: "kv" as const,
      entries: [{ key: "Symbol", value: "AAPL" }],
    };
    expect(parseChatBlock(block)).toEqual(block);
  });

  it("round-trips action blocks with confirm fields", () => {
    const block = {
      kind: "action" as const,
      title: "Delete drawing",
      summary: "Remove the horizontal line?",
      primaryLabel: "Accept",
      secondaryLabel: "Reject",
      callId: "c2",
      name: "delete_drawing",
      confirmationToken: "tok_abc",
      requiresClientSession: true,
    };
    expect(parseChatBlock(block)).toEqual(block);
  });

  it("round-trips action blocks with summaryRows", () => {
    const block = {
      kind: "action" as const,
      title: "Place order",
      summary: "Submit this order?",
      summaryRows: [
        { key: "Symbol", value: "AAPL" },
        { key: "Side", value: "BUY" },
        { key: "Qty", value: "10" },
      ],
      primaryLabel: "Accept",
      secondaryLabel: "Reject",
      name: "place_order",
    };
    expect(parseChatBlock(block)).toEqual(block);
  });

  it("round-trips reference blocks", () => {
    const block = {
      kind: "reference" as const,
      chips: [
        {
          id: "ref-1",
          label: "AAPL · 1D",
          target: { type: "symbol-interval" as const, symbol: "AAPL", interval: "1D" },
        },
      ],
    };
    expect(parseChatBlock(block)).toEqual(block);
  });

  it("round-trips follow-up blocks", () => {
    const block = {
      kind: "followups" as const,
      chips: [{ id: "f1", prompt: "Summarize the chart" }],
    };
    expect(parseChatBlock(block)).toEqual(block);
  });

  it("round-trips follow-up blocks with optional label", () => {
    const block = {
      kind: "followups" as const,
      chips: [
        {
          id: "prepare_analysis",
          label: "Prepare chart for analysis",
          prompt: "Prepare the active symbol for analysis…",
        },
      ],
    };
    expect(parseChatBlock(block)).toEqual(block);
  });

  it("rejects unknown block kinds", () => {
    expect(() => parseChatBlock({ kind: "text", body: "hello" })).toThrow();
  });

  it("rejects oversized data rows", () => {
    expect(() =>
      parseChatBlock({
        kind: "data",
        shape: "table",
        columns: [{ id: "symbol", label: "Symbol" }],
        rows: Array.from({ length: CHAT_BLOCK_MAX_DATA_ROWS + 1 }, () => ({
          symbol: "AAPL",
        })),
      }),
    ).toThrow();
  });

  it("rejects oversized follow-up chip lists", () => {
    expect(() =>
      parseChatBlock({
        kind: "followups",
        chips: Array.from({ length: CHAT_BLOCK_MAX_FOLLOWUPS + 1 }, (_, index) => ({
          id: `f${index}`,
          prompt: "Next",
        })),
      }),
    ).toThrow();
  });
});

describe("parseChatBlocks", () => {
  it("parses an ordered block list", () => {
    const blocks = [
      {
        kind: "trace" as const,
        steps: [{ callId: "c1", name: "search_symbols", status: "done" as const }],
      },
      {
        kind: "followups" as const,
        chips: [{ id: "f1", prompt: "Compare with MSFT" }],
      },
    ];
    expect(parseChatBlocks(blocks)).toEqual(blocks);
  });
});
