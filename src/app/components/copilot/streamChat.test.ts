import { describe, expect, it, vi } from "vitest";
import {
  parseNdjsonEvent,
  splitNdjsonLines,
  streamChat,
} from "./streamChat";

describe("splitNdjsonLines", () => {
  it("splits complete lines and keeps remainder", () => {
    const { lines, remainder } = splitNdjsonLines(
      '{"type":"text-delta","delta":"Hi"}\n{"type":"done"}\n{"type":"',
    );
    expect(lines).toHaveLength(2);
    expect(remainder).toBe('{"type":"');
  });
});

describe("parseNdjsonEvent", () => {
  it("parses valid agent stream events", () => {
    const event = parseNdjsonEvent('{"type":"text-delta","delta":"Hello"}');
    expect(event).toEqual({ type: "text-delta", delta: "Hello" });
  });

  it("returns null for invalid payloads", () => {
    expect(parseNdjsonEvent('{"type":"unknown"}')).toBeNull();
  });
});

describe("streamChat", () => {
  it("maps missing OpenRouter key to config error", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ code: "missing_openrouter_key" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const events: unknown[] = [];
    const result = await streamChat(
      { messages: [{ role: "user", content: "hello" }] },
      {
        onEvent: (event) => events.push(event),
        fetchFn,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("missing_key");
    }
    expect(events).toHaveLength(0);
  });

  it("streams NDJSON events until done", async () => {
    const body = [
      '{"type":"text-delta","delta":"Hi"}',
      '{"type":"tool-call","callId":"c1","name":"search_symbols","arguments":{"query":"AAPL"}}',
      '{"type":"tool-result","callId":"c1","ok":true,"summary":"1 symbol"}',
      '{"type":"done"}',
    ].join("\n");

    const fetchFn = vi.fn(async () => new Response(body, { status: 200 }));

    const events: string[] = [];
    const result = await streamChat(
      { messages: [{ role: "user", content: "hello" }] },
      {
        onEvent: (event) => events.push(event.type),
        fetchFn,
      },
    );

    expect(result.ok).toBe(true);
    expect(events).toEqual(["text-delta", "tool-call", "tool-result", "done"]);
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/ai/chat",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"permissionMode":"write"'),
      }),
    );
  });

  it("returns aborted result when signal fires", async () => {
    const controller = new AbortController();
    const fetchFn = vi.fn(async () => {
      controller.abort();
      throw new DOMException("Aborted", "AbortError");
    });

    const result = await streamChat(
      { messages: [{ role: "user", content: "hello" }] },
      {
        signal: controller.signal,
        onEvent: () => {},
        fetchFn,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.aborted).toBe(true);
      expect(result.error.kind).toBe("aborted");
    }
  });
});
