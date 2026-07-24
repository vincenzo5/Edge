import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  JOB_TIMEOUT_MS,
  SESSION_TTL_MS,
  assertBridgeAccess,
  completeJob,
  dequeueJob,
  enqueueSessionExecution,
  registerHeartbeat,
  registerHeartbeatForTests,
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
    registerHeartbeatForTests();

    const pending = enqueueSessionExecution("get_app_state", {});
    const job = dequeueJob();

    expect(job).not.toBeNull();
    expect(job?.name).toBe("get_app_state");

    completeJob(job!.jobId, { ok: true, data: { hydrated: true } });
    await expect(pending).resolves.toEqual({ ok: true, data: { hydrated: true } });
  });

  it("expires session after TTL", async () => {
    registerHeartbeatForTests();
    vi.advanceTimersByTime(SESSION_TTL_MS + 1);

    expect(dequeueJob()).toBeNull();

    const result = await enqueueSessionExecution("get_app_state", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("requires_client_session");
    }
  });

  it("times out jobs when browser never completes", async () => {
    registerHeartbeatForTests();

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
    const { bridgeSecret } = registerHeartbeatForTests();

    const pollPromise = waitForJob(5_000);
    registerHeartbeat({ sessionId: undefined, bridgeSecret });

    void enqueueSessionExecution("get_app_state", {});

    await expect(pollPromise).resolves.toMatchObject({ name: "get_app_state" });
  });

  it("defaults permissionMode to read when not specified", async () => {
    registerHeartbeatForTests();

    void enqueueSessionExecution("get_app_state", {});
    const job = dequeueJob();

    expect(job?.permissionMode).toBe("read");
  });

  it("delivers a job to only one poll waiter", async () => {
    registerHeartbeatForTests();

    const pollA = waitForJob(5_000);
    const pollB = waitForJob(5_000);

    void enqueueSessionExecution("get_app_state", {});

    const jobA = await pollA;
    expect(jobA).toMatchObject({ name: "get_app_state" });

    await vi.advanceTimersByTimeAsync(5_001);
    const jobB = await pollB;
    expect(jobB).toBeNull();
    expect(dequeueJob()).toBeNull();
  });

  it("mints bridge secret on first heartbeat", () => {
    const mint = registerHeartbeat({});
    expect(mint.ok).toBe(true);
    if (mint.ok) {
      expect(mint.bridgeSecret).toBeTruthy();
      expect(mint.sessionId).toBeTruthy();
    }
  });

  it("rejects hijack heartbeat without bridge secret", () => {
    registerHeartbeatForTests();
    const hijack = registerHeartbeat({});
    expect(hijack.ok).toBe(false);
    if (!hijack.ok) {
      expect(hijack.status).toBe(409);
    }
  });

  it("rejects poll/result access without bridge secret", () => {
    registerHeartbeatForTests();
    expect(assertBridgeAccess(undefined).ok).toBe(false);
    expect(assertBridgeAccess("wrong-secret").ok).toBe(false);
  });

  it("rejects user rebinding on refresh", () => {
    const mint = registerHeartbeat({ userId: "user-a" });
    expect(mint.ok).toBe(true);
    if (!mint.ok) return;

    const refresh = registerHeartbeat({
      bridgeSecret: mint.bridgeSecret,
      sessionId: mint.sessionId,
      userId: "user-b",
    });
    expect(refresh.ok).toBe(false);
    if (!refresh.ok) {
      expect(refresh.status).toBe(403);
    }
  });
});
