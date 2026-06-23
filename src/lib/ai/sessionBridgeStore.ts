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
  lastSeen: number;
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

export function isSessionActive(): boolean {
  if (!activeSession) return false;
  return Date.now() - activeSession.lastSeen <= SESSION_TTL_MS;
}

export function registerHeartbeat(sessionId?: string): { sessionId: string; active: boolean } {
  const id = sessionId?.trim() || activeSession?.sessionId || createSessionId();
  activeSession = { sessionId: id, lastSeen: Date.now() };
  return { sessionId: id, active: true };
}

export function dequeueJob(): SessionJob | null {
  if (!isSessionActive()) return null;
  return pendingQueue.shift() ?? null;
}

function notifyPollWaiters(job: SessionJob | null): void {
  for (const notify of pollWaiters) {
    notify(job);
  }
  pollWaiters.clear();
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
    permissionMode: options.permissionMode ?? "write",
    confirmed: options.confirmed ?? false,
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
    notifyPollWaiters(job);
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
