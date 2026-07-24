import { describe, expect, it } from "vitest";
import { z } from "zod";

import { defineTool } from "../types";
import {
  applyAgentDrawingDefaults,
  buildConfirmReason,
  resolveConfirmExecuteOptions,
  toolNeedsConfirmGate,
} from "./confirmGate";

describe("confirmGate", () => {
  it("detects confirm gate for destructive and requiresConfirmation tools", () => {
    const destructive = defineTool({
      name: "delete_drawing",
      description: "delete",
      inputSchema: z.object({ drawingId: z.string() }),
      permission: "destructive",
      requiresConfirmation: true,
      execute: async () => ({ ok: true, data: {} }),
    });
    const writeConfirm = defineTool({
      name: "save_pattern_capture",
      description: "save",
      inputSchema: z.object({}),
      permission: "write",
      requiresConfirmation: true,
      execute: async () => ({ ok: true, data: {} }),
    });
    const plainWrite = defineTool({
      name: "add_drawing",
      description: "add",
      inputSchema: z.object({}),
      permission: "write",
      requiresConfirmation: false,
      execute: async () => ({ ok: true, data: {} }),
    });

    expect(toolNeedsConfirmGate(destructive)).toBe(true);
    expect(toolNeedsConfirmGate(writeConfirm)).toBe(true);
    expect(toolNeedsConfirmGate(plainWrite)).toBe(false);
  });

  it("builds place_order reason mentioning LIVE gate", () => {
    const tool = defineTool({
      name: "place_order",
      description: "place",
      inputSchema: z.object({}),
      permission: "destructive",
      requiresConfirmation: true,
      execute: async () => ({ ok: true, data: {} }),
    });
    expect(buildConfirmReason(tool)).toMatch(/LIVE/i);
  });

  it("resolves full mode for destructive tool names", () => {
    expect(resolveConfirmExecuteOptions("place_order", "destructive", "token-1")).toEqual({
      permissionMode: "full",
      confirmationToken: "token-1",
    });
    expect(resolveConfirmExecuteOptions("create_alert", "write", "token-2")).toEqual({
      permissionMode: "write",
      confirmationToken: "token-2",
    });
  });

  it("defaults add_drawing metadata to ai proposed", () => {
    expect(
      applyAgentDrawingDefaults("add_drawing", {
        type: "hline",
        points: [{ timestamp: 1, value: 2 }],
      }),
    ).toEqual({
      type: "hline",
      points: [{ timestamp: 1, value: 2 }],
      metadata: { source: "ai", status: "proposed" },
    });
  });

  it("preserves explicit drawing metadata", () => {
    expect(
      applyAgentDrawingDefaults("add_drawing", {
        metadata: { source: "user", status: "active", kind: "thesis" },
      }),
    ).toEqual({
      metadata: { source: "user", status: "active", kind: "thesis" },
    });
  });

  it("stamps threadId and messageId when linkage provided", () => {
    expect(
      applyAgentDrawingDefaults(
        "add_drawing",
        { type: "hline", points: [{ timestamp: 1, value: 2 }] },
        { threadId: "thread-1", messageId: "msg-1" },
      ),
    ).toEqual({
      type: "hline",
      points: [{ timestamp: 1, value: 2 }],
      metadata: {
        source: "ai",
        status: "proposed",
        threadId: "thread-1",
        messageId: "msg-1",
      },
    });
  });

  it("does not overwrite existing linkage ids", () => {
    expect(
      applyAgentDrawingDefaults(
        "add_drawing",
        {
          metadata: { threadId: "existing-thread", messageId: "existing-msg" },
        },
        { threadId: "thread-1", messageId: "msg-1" },
      ),
    ).toEqual({
      metadata: {
        source: "ai",
        status: "proposed",
        threadId: "existing-thread",
        messageId: "existing-msg",
      },
    });
  });
});
