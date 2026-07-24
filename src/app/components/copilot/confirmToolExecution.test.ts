import { describe, expect, it, vi } from "vitest";
import { executeConfirmedTool } from "./confirmToolExecution";

describe("executeConfirmedTool", () => {
  it("rejects missing confirmation token", async () => {
    const result = await executeConfirmedTool(
      "delete_drawing",
      { drawingId: "d1" },
      { confirmationToken: "" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("confirmation_required");
  });

  it("uses session execute for client-session tools", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, data: { deleted: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await executeConfirmedTool(
      "delete_drawing",
      { drawingId: "d1" },
      {
        confirmationToken: "token-1",
        requiresClientSession: true,
        fetchFn,
      },
    );

    expect(result.ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/ai/session/execute",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"confirmationToken":"token-1"'),
      }),
    );
  });

  it("uses tools execute for server-only tools", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, data: { saved: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await executeConfirmedTool(
      "save_pattern_capture",
      { name: "setup" },
      {
        confirmationToken: "token-2",
        fetchFn,
      },
    );

    expect(result.ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/ai/tools/execute",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"confirmationToken":"token-2"'),
      }),
    );
  });

  it("stamps drawing linkage on confirmed add_drawing", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, data: { id: "d1" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await executeConfirmedTool(
      "add_drawing",
      { type: "hline", points: [{ timestamp: 1, value: 2 }] },
      {
        confirmationToken: "token-3",
        requiresClientSession: true,
        fetchFn,
        drawingLinkage: { threadId: "thread-1", messageId: "msg-1" },
      },
    );

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/ai/session/execute",
      expect.objectContaining({
        body: expect.stringContaining('"threadId":"thread-1"'),
      }),
    );
  });
});
