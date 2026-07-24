import type { ExecuteToolOptions, SessionJob, ToolResult } from "./types";

/** Keep generous for dev: background tabs throttle heartbeats. */
export const SESSION_TTL_MS = 90_000;
export const JOB_TIMEOUT_MS = 30_000;
export const POLL_WAIT_MS = 5_000;

type PendingJob = SessionJob & {
  resolve: (result: ToolResult) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

type ActiveSession = {
  sessionId: string;
  bridgeSecret: string;
  lastSeen: number;
  userId?: string;
};

let activeSession: ActiveSession | null = null;
const pendingQueue: SessionJob[] = [];
const pendingJobs = new Map<string, PendingJob>();
const pollWaiters = new Set<(job: SessionJob | null) => void>();

function createJobId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createBridgeSecret(): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `bridge-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function secretsEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function isSessionActive(): boolean {
  if (!activeSession) return false;
  return Date.now() - activeSession.lastSeen <= SESSION_TTL_MS;
}

export type RegisterHeartbeatInput = {
  sessionId?: string;
  bridgeSecret?: string;
  userId?: string | null;
};

export type RegisterHeartbeatResult =
  | { ok: true; sessionId: string; active: true; bridgeSecret?: string }
  | { ok: false; status: 401 | 403 | 409; error: string };

export function verifyBridgeSecret(provided: string | undefined): boolean {
  if (!isSessionActive() || !activeSession || !provided) return false;
  return secretsEqual(provided, activeSession.bridgeSecret);
}

export function assertBridgeAccess(
  provided: string | undefined,
): { ok: true } | { ok: false; status: 401; error: string } {
  if (!isSessionActive()) {
    return { ok: false, status: 401, error: "No active browser session." };
  }
  if (!verifyBridgeSecret(provided)) {
    return { ok: false, status: 401, error: "Missing or invalid bridge secret." };
  }
  return { ok: true };
}

export function registerHeartbeat(
  input: RegisterHeartbeatInput = {},
): RegisterHeartbeatResult {
  const sessionId = input.sessionId?.trim();
  const bridgeSecret = input.bridgeSecret?.trim();
  const incomingUserId = input.userId ?? undefined;

  if (isSessionActive() && activeSession) {
    if (!bridgeSecret) {
      return {
        ok: false,
        status: 409,
        error: "Session already active. Provide bridge secret to refresh.",
      };
    }

    if (!secretsEqual(bridgeSecret, activeSession.bridgeSecret)) {
      return {
        ok: false,
        status: 401,
        error: "Invalid bridge secret.",
      };
    }

    if (sessionId && sessionId !== activeSession.sessionId) {
      return {
        ok: false,
        status: 401,
        error: "Session id does not match active bridge.",
      };
    }

    if (
      activeSession.userId &&
      incomingUserId &&
      incomingUserId !== activeSession.userId
    ) {
      return {
        ok: false,
        status: 403,
        error: "Bridge session is bound to a different user.",
      };
    }

    if (!activeSession.userId && incomingUserId) {
      activeSession.userId = incomingUserId;
    }

    activeSession.lastSeen = Date.now();
    return { ok: true, sessionId: activeSession.sessionId, active: true };
  }

  const id = sessionId || createSessionId();
  const secret = createBridgeSecret();
  activeSession = {
    sessionId: id,
    bridgeSecret: secret,
    lastSeen: Date.now(),
    ...(incomingUserId ? { userId: incomingUserId } : {}),
  };

  return {
    ok: true,
    sessionId: id,
    active: true,
    bridgeSecret: secret,
  };
}

/** Backward-compatible helper for in-process agent/tests that bypass HTTP auth. */
export function registerHeartbeatForTests(sessionId?: string): {
  sessionId: string;
  active: boolean;
  bridgeSecret: string;
} {
  const result = registerHeartbeat({ sessionId });
  if (!result.ok) {
    throw new Error(result.error);
  }
  const secret =
    result.bridgeSecret ??
    activeSession?.bridgeSecret ??
    (() => {
      throw new Error("Missing bridge secret after mint");
    })();
  return { sessionId: result.sessionId, active: true, bridgeSecret: secret };
}

export function getActiveBridgeSecretForTests(): string | null {
  if (!isSessionActive() || !activeSession) return null;
  return activeSession.bridgeSecret;
}

export function dequeueJob(): SessionJob | null {
  if (!isSessionActive()) return null;
  return pendingQueue.shift() ?? null;
}

/** Deliver one queued job to a single poll waiter (avoids multi-tab duplicate runs). */
function dispatchToPollWaiter(): void {
  if (pollWaiters.size === 0 || !isSessionActive()) return;

  const job = pendingQueue.shift();
  if (!job) return;

  const [waiter] = pollWaiters;
  if (!waiter) {
    pendingQueue.unshift(job);
    return;
  }

  pollWaiters.delete(waiter);
  waiter(job);
}

export function waitForJob(timeoutMs = POLL_WAIT_MS): Promise<SessionJob | null> {
  const immediate = dequeueJob();
  if (immediate) return Promise.resolve(immediate);

  return new Promise((resolve) => {
    let settled = false;

    const finish = (job: SessionJob | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      pollWaiters.delete(finish);
      resolve(job);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);
    pollWaiters.add(finish);
  });
}

export function enqueueSessionExecution(
  name: string,
  input: unknown,
  options: ExecuteToolOptions = {},
): Promise<ToolResult> {
  if (!isSessionActive()) {
    return Promise.resolve({
      ok: false,
      error: "No active Edge browser session. Open the app in your browser.",
      code: "requires_client_session",
    });
  }

  const jobId = createJobId();
  const job: SessionJob = {
    jobId,
    name,
    input,
    permissionMode: options.permissionMode ?? "read",
    confirmed: options.confirmed ?? false,
    confirmationToken: options.confirmationToken,
    confirmationValidatedByServer: options.confirmationValidatedByServer ?? false,
    enqueuedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingJobs.delete(jobId);
      const idx = pendingQueue.findIndex((j) => j.jobId === jobId);
      if (idx >= 0) pendingQueue.splice(idx, 1);
      resolve({
        ok: false,
        error: `Tool "${name}" timed out waiting for browser session`,
        code: "execution",
      });
    }, JOB_TIMEOUT_MS);

    const pending: PendingJob = {
      ...job,
      resolve,
      reject,
      timeoutId,
    };

    pendingJobs.set(jobId, pending);
    pendingQueue.push(job);
    dispatchToPollWaiter();
  });
}

export function completeJob(jobId: string, result: ToolResult): boolean {
  const pending = pendingJobs.get(jobId);
  if (!pending) return false;

  clearTimeout(pending.timeoutId);
  pendingJobs.delete(jobId);

  const idx = pendingQueue.findIndex((j) => j.jobId === jobId);
  if (idx >= 0) pendingQueue.splice(idx, 1);

  pending.resolve(result);
  return true;
}

/** Test helper — reset module state between unit tests. */
export function resetSessionBridgeForTests(): void {
  for (const pending of pendingJobs.values()) {
    clearTimeout(pending.timeoutId);
  }
  pendingJobs.clear();
  pendingQueue.length = 0;
  pollWaiters.clear();
  activeSession = null;
}
