import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  JOB_TIMEOUT_MS,
  SESSION_TTL_MS,
  completeJob,
  dequeueJob,
  enqueueSessionExecution,
  registerHeartbeat,
  resetSessionBridgeForTests,
  waitForJob,
} from "./sessionBridgeStore";

describe("sessionBridge", () => {
  beforeEach(() => {
    resetSessionBridgeForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    resetSessionBridgeForTests();
    vi.useRealTimers();
  });

  it("returns no session error when heartbeat is missing", async () => {
    const result = await enqueueSessionExecution("get_app_state", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("requires_client_session");
    }
  });

  it("enqueues and dequeues jobs while session is active", async () => {
    registerHeartbeat();

    const pending = enqueueSessionExecution("get_app_state", {});
    const job = dequeueJob();

    expect(job).not.toBeNull();
    expect(job?.name).toBe("get_app_state");

    completeJob(job!.jobId, { ok: true, data: { hydrated: true } });
    await expect(pending).resolves.toEqual({ ok: true, data: { hydrated: true } });
  });

  it("expires session after TTL", async () => {
    registerHeartbeat();
    vi.advanceTimersByTime(SESSION_TTL_MS + 1);

    expect(dequeueJob()).toBeNull();

    const result = await enqueueSessionExecution("get_app_state", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("requires_client_session");
    }
  });

  it("times out jobs when browser never completes", async () => {
    registerHeartbeat();

    const pending = enqueueSessionExecution("get_app_state", {});
    dequeueJob();

    vi.advanceTimersByTime(JOB_TIMEOUT_MS + 1);

    await expect(pending).resolves.toEqual({
      ok: false,
      error: 'Tool "get_app_state" timed out waiting for browser session',
      code: "execution",
    });
  });

  it("notifies poll waiters when a job is enqueued", async () => {
    registerHeartbeat();

    const pollPromise = waitForJob(5_000);
    registerHeartbeat();

    void enqueueSessionExecution("get_app_state", {});

    await expect(pollPromise).resolves.toMatchObject({ name: "get_app_state" });
  });
});
