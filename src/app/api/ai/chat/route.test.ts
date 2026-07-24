import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { POST } from "./route";

describe("POST /api/ai/chat", () => {
  const originalKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = originalKey;
    }
  });

  it("returns 503 when OPENROUTER_API_KEY is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
        }),
      }),
    );

    expect(response.status).toBe(503);
    const json = (await response.json()) as { code?: string };
    expect(json.code).toBe("missing_openrouter_key");
  });

  it("returns 400 for invalid chat requests", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";

    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("streams NDJSON agent events with a mocked OpenRouter provider", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {},
          {
            status: 200,
            headers: { "Content-Type": "text/event-stream" },
          },
        ),
      ),
    );

    // Patch stream body via fetch mock returning SSE
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"choices":[{"delta":{"content":"Hello from Edge"}}]}\n\n',
              ),
            );
            controller.enqueue(
              new TextEncoder().encode('data: {"choices":[{"finish_reason":"stop"}]}\n\n'),
            );
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        return new Response(body, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/x-ndjson");

    const text = await response.text();
    const lines = text.trim().split("\n").filter(Boolean);
    const events = lines.map((line) => JSON.parse(line) as { type: string });
    expect(events.some((event) => event.type === "text-delta")).toBe(true);
    expect(events.at(-1)).toEqual({ type: "done", finishReason: "stop" });
  });
});
