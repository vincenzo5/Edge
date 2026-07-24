import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as postHeartbeat } from "./heartbeat/route";
import { GET as getPoll } from "./poll/route";
import { POST as postResult } from "./result/route";
import { POST as postExecute } from "./execute/route";
import {
  completeJob,
  dequeueJob,
  registerHeartbeatForTests,
  resetSessionBridgeForTests,
} from "@/lib/ai/sessionBridge";
import { BRIDGE_SECRET_HEADER } from "@/lib/ai/bridgeConstants";

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  getCurrentUser: vi.fn(async () => null),
}));

describe("/api/ai/session routes", () => {
  beforeEach(() => {
    resetSessionBridgeForTests();
    vi.useFakeTimers();
    process.env.EDGE_API_KEY = "test-api-key";
    process.env.EDGE_TRUST_LOCALHOST = "false";
    delete process.env.EDGE_API_AUTH_MODE;
  });

  afterEach(() => {
    resetSessionBridgeForTests();
    vi.useRealTimers();
    delete process.env.EDGE_API_KEY;
    delete process.env.EDGE_TRUST_LOCALHOST;
  });

  it("mints bridge secret on heartbeat", async () => {
    const res = await postHeartbeat(
      new Request("http://localhost/api/ai/session/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bridgeSecret).toBeTruthy();
    expect(body.sessionId).toBeTruthy();
  });

  it("returns 409 when hijacking active session without secret", async () => {
    registerHeartbeatForTests();

    const res = await postHeartbeat(
      new Request("http://localhost/api/ai/session/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(409);
  });

  it("returns 401 on poll without bridge secret", async () => {
    registerHeartbeatForTests();

    const res = await getPoll(new Request("http://localhost/api/ai/session/poll"));
    expect(res.status).toBe(401);
  });

  it("polls with valid bridge secret", async () => {
    const { bridgeSecret } = registerHeartbeatForTests();

    const pollPromise = getPoll(
      new Request("http://localhost/api/ai/session/poll", {
        headers: { [BRIDGE_SECRET_HEADER]: bridgeSecret },
      }),
    );
    await vi.advanceTimersByTimeAsync(5_001);
    const res = await pollPromise;
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.job).toBeNull();
  });

  it("returns 401 on result without bridge secret", async () => {
    registerHeartbeatForTests();

    const res = await postResult(
      new Request("http://localhost/api/ai/session/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: "job-1",
          result: { ok: true, data: {} },
        }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("allows execute with API key when bridge secret is absent", async () => {
    registerHeartbeatForTests();

    const executePromise = postExecute(
      new NextRequest("http://localhost/api/ai/session/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Edge-Api-Key": "test-api-key",
        },
        body: JSON.stringify({
          name: "get_app_state",
          input: {},
          permissionMode: "read",
        }),
      }),
    );

    await vi.advanceTimersByTimeAsync(0);
    const job = dequeueJob();
    expect(job).toMatchObject({ name: "get_app_state" });
    if (job) {
      completeJob(job.jobId, { ok: true, data: { hydrated: true } });
    }

    const res = await executePromise;
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
