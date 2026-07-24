import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import AiSessionBridge, { AI_SESSION_HEARTBEAT_INTERVAL_MS } from "./AiSessionBridge";
import { BRIDGE_SECRET_HEADER } from "@/lib/ai/bridgeConstants";

const executeMock = vi.fn();
const useAiToolsMock = vi.fn(() => ({
  execute: executeMock,
}));

vi.mock("./AiToolsProvider", () => ({
  useAiTools: () => useAiToolsMock(),
}));

describe("AiSessionBridge", () => {
  const fetchMock = vi.fn();
  let pollCount = 0;
  let resolvePollBlock: (() => void) | undefined;

  beforeEach(() => {
    pollCount = 0;
    resolvePollBlock = undefined;
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/ai/session/heartbeat") {
        return {
          ok: true,
          json: async () => ({ sessionId: "session-1", bridgeSecret: "secret-1" }),
        };
      }
      if (url === "/api/ai/session/poll") {
        pollCount += 1;
        if (pollCount >= 2) {
          await new Promise<void>((resolve) => {
            resolvePollBlock = resolve;
          });
        }
        return {
          ok: true,
          json: async () => ({ job: null }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });
    useAiToolsMock.mockReturnValue({ execute: executeMock });
  });

  afterEach(() => {
    resolvePollBlock?.();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    executeMock.mockReset();
  });

  it("heartbeats on mount and polls without per-poll heartbeats", async () => {
    render(<AiSessionBridge />);

    await waitFor(() => expect(pollCount).toBeGreaterThanOrEqual(1));

    const pollCall = fetchMock.mock.calls.find((call) => call[0] === "/api/ai/session/poll");
    expect(pollCall?.[1]?.headers?.[BRIDGE_SECRET_HEADER]).toBe("secret-1");

    const heartbeatCalls = fetchMock.mock.calls.filter(
      (call) => call[0] === "/api/ai/session/heartbeat",
    ).length;
    const pollCalls = fetchMock.mock.calls.filter(
      (call) => call[0] === "/api/ai/session/poll",
    ).length;

    expect(heartbeatCalls).toBe(1);
    expect(pollCalls).toBeGreaterThanOrEqual(1);
    expect(AI_SESSION_HEARTBEAT_INTERVAL_MS).toBe(45_000);
  });

  it("runs polled jobs and posts results", async () => {
    const job = {
      jobId: "job-1",
      name: "get_chart_state",
      input: {},
      permissionMode: "read" as const,
      confirmed: false,
      enqueuedAt: Date.now(),
    };
    let pollReturnsJob = true;

    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/ai/session/heartbeat") {
        return {
          ok: true,
          json: async () => ({ sessionId: "session-1", bridgeSecret: "secret-1" }),
        };
      }
      if (url === "/api/ai/session/poll") {
        if (pollReturnsJob) {
          pollReturnsJob = false;
          return {
            ok: true,
            json: async () => ({ job }),
          };
        }
        await new Promise<void>((resolve) => {
          resolvePollBlock = resolve;
        });
        return {
          ok: true,
          json: async () => ({ job: null }),
        };
      }
      if (url === "/api/ai/session/result") {
        return { ok: true, json: async () => ({ ok: true }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    executeMock.mockResolvedValue({ ok: true, data: { symbol: "AAPL" } });

    render(<AiSessionBridge />);

    await waitFor(() => {
      expect(executeMock).toHaveBeenCalledWith("get_chart_state", {}, {
        permissionMode: "read",
        confirmationValidatedByServer: undefined,
      });
    });

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          (call) =>
            call[0] === "/api/ai/session/result" &&
            JSON.stringify(call[1]?.body).includes("job-1"),
        ),
      ).toBe(true);
    });
  });

  it("posts failure results when execute throws", async () => {
    const job = {
      jobId: "job-2",
      name: "get_chart_state",
      input: {},
      permissionMode: "read" as const,
      confirmed: false,
      enqueuedAt: Date.now(),
    };
    let pollReturnsJob = true;

    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/ai/session/heartbeat") {
        return {
          ok: true,
          json: async () => ({ sessionId: "session-1", bridgeSecret: "secret-1" }),
        };
      }
      if (url === "/api/ai/session/poll") {
        if (pollReturnsJob) {
          pollReturnsJob = false;
          return {
            ok: true,
            json: async () => ({ job }),
          };
        }
        await new Promise<void>((resolve) => {
          resolvePollBlock = resolve;
        });
        return {
          ok: true,
          json: async () => ({ job: null }),
        };
      }
      if (url === "/api/ai/session/result") {
        return { ok: true, json: async () => ({ ok: true }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    executeMock.mockRejectedValue(new Error("boom"));

    render(<AiSessionBridge />);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          (call) =>
            call[0] === "/api/ai/session/result" &&
            JSON.stringify(call[1]?.body).includes("boom"),
        ),
      ).toBe(true);
    });
  });
});
