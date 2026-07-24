import { afterEach, describe, expect, it, vi } from "vitest";
import { logSessionBridgeCall } from "./sessionBridgeExecute";
import { runWithRequestId } from "@/lib/observability/requestIdContext";

describe("logSessionBridgeCall", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("includes requestId when ALS context is set", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    runWithRequestId("bridge-req-1", () => {
      logSessionBridgeCall({
        tool: "set_symbol",
        ok: true,
        durationMs: 8,
        source: "http",
      });
    });

    const line = JSON.parse(String(consoleSpy.mock.calls[0]?.[0]));
    expect(line).toMatchObject({
      event: "session.bridge",
      tool: "set_symbol",
      ok: true,
      requestId: "bridge-req-1",
    });
  });
});
