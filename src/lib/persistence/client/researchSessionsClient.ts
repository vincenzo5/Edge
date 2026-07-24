import {
  applyCloudResearchSessionRecord,
  createResearchSession,
  deleteResearchSession,
  getActiveSessionRecord,
  getResearchSessionRecord,
  listResearchSessionSummaries,
  renameResearchSession,
  setActiveResearchSession,
  DEFAULT_RESEARCH_SESSION_TITLE,
  type LocalResearchSessionRecord,
} from "@/lib/research/boardSessionStore";
import { persistenceFetch } from "@/lib/persistence/client/persistenceFetch";
import type {
  ResearchSessionResponse,
  ResearchSessionSummary,
} from "@/lib/persistence/schemas/researchSessions";

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toLocalRecord(input: ResearchSessionResponse): LocalResearchSessionRecord {
  return {
    id: input.id,
    title: input.title,
    schemaVersion: input.schemaVersion,
    syncRevision: input.syncRevision,
    updatedAt: input.updatedAt,
    ...(input.question ? { question: input.question } : {}),
    cards: input.cards,
    links: input.links,
    threadIds: input.threadIds,
    reel: input.reel,
    archivedAt: null,
  };
}

function recordToWritePayload(record: LocalResearchSessionRecord) {
  return {
    title: record.title,
    ...(record.question ? { question: record.question } : {}),
    cards: record.cards,
    links: record.links,
    threadIds: record.threadIds,
    reel: record.reel,
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function isCloudUnavailable(response: Response): boolean {
  return response.status === 503;
}

export async function listResearchSessionSummariesRemote(): Promise<ResearchSessionSummary[]> {
  const response = await persistenceFetch("/api/me/research-sessions");
  if (isCloudUnavailable(response) || !response.ok) {
    return listResearchSessionSummaries();
  }
  const json = await parseJsonResponse<{ sessions: ResearchSessionSummary[] }>(response);
  return json?.sessions ?? listResearchSessionSummaries();
}

export async function loadResearchSession(
  sessionId: string,
): Promise<{ record: LocalResearchSessionRecord; source: "local" | "cloud" } | null> {
  const local = getResearchSessionRecord(sessionId);
  const response = await persistenceFetch(`/api/me/research-sessions/${sessionId}`);
  if (isCloudUnavailable(response)) {
    return local ? { record: local, source: "local" } : null;
  }
  if (response.status === 404) {
    return local ? { record: local, source: "local" } : null;
  }
  if (!response.ok) {
    return local ? { record: local, source: "local" } : null;
  }

  const cloud = await parseJsonResponse<ResearchSessionResponse>(response);
  if (!cloud) {
    return local ? { record: local, source: "local" } : null;
  }

  const cloudRecord = toLocalRecord(cloud);
  if (!local || cloud.syncRevision >= local.syncRevision) {
    applyCloudResearchSessionRecord(cloudRecord);
    return { record: cloudRecord, source: "cloud" };
  }

  return { record: local, source: "local" };
}

export async function hydrateResearchSessionsState(): Promise<{
  activeSessionId: string;
  sessions: ResearchSessionSummary[];
  syncRevision: number;
  title: string;
}> {
  const active = getActiveSessionRecord();
  const cloudSummaries = await listResearchSessionSummariesRemote();

  for (const summary of cloudSummaries) {
    const local = getResearchSessionRecord(summary.id);
    if (!local || summary.syncRevision > local.syncRevision) {
      await loadResearchSession(summary.id);
    }
  }

  let activeSessionId = active.id;
  const summaries = listResearchSessionSummaries();
  if (!summaries.some((entry) => entry.id === activeSessionId)) {
    activeSessionId = summaries[0]?.id ?? activeSessionId;
    setActiveResearchSession(activeSessionId);
  }

  const loaded = getResearchSessionRecord(activeSessionId) ?? active;
  setActiveResearchSession(loaded.id);

  return {
    activeSessionId: loaded.id,
    sessions: listResearchSessionSummaries(),
    syncRevision: loaded.syncRevision,
    title: loaded.title,
  };
}

export async function saveResearchSessionState(input: {
  sessionId: string;
  syncRevision: number;
}): Promise<{ syncRevision: number; title: string }> {
  const record = getResearchSessionRecord(input.sessionId);
  if (!record) {
    return { syncRevision: input.syncRevision, title: DEFAULT_RESEARCH_SESSION_TITLE };
  }

  const payload = recordToWritePayload(record);
  const response = await persistenceFetch(`/api/me/research-sessions/${input.sessionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schemaVersion: 1,
      baseRevision: input.syncRevision,
      ...payload,
    }),
  });

  if (isCloudUnavailable(response) || response.status === 404) {
    if (response.status === 404) {
      const createResponse = await persistenceFetch("/api/me/research-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          id: input.sessionId,
          ...payload,
        }),
      });
      if (createResponse.ok) {
        const created = await parseJsonResponse<ResearchSessionResponse>(createResponse);
        if (created) {
          const synced = toLocalRecord(created);
          applyCloudResearchSessionRecord(synced);
          return { syncRevision: created.syncRevision, title: created.title };
        }
      }
    }
    return { syncRevision: input.syncRevision, title: record.title };
  }

  if (response.status === 409) {
    const conflict = await parseJsonResponse<{
      current?: ResearchSessionResponse;
    }>(response);
    const currentRevision = conflict?.current?.syncRevision;
    if (typeof currentRevision === "number") {
      const retry = await persistenceFetch(`/api/me/research-sessions/${input.sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          baseRevision: currentRevision,
          ...payload,
        }),
      });
      if (retry.ok) {
        const saved = await parseJsonResponse<ResearchSessionResponse>(retry);
        if (saved) {
          const synced = toLocalRecord(saved);
          applyCloudResearchSessionRecord(synced);
          return { syncRevision: saved.syncRevision, title: saved.title };
        }
      }
    }
    return { syncRevision: input.syncRevision, title: record.title };
  }

  if (!response.ok) {
    return { syncRevision: input.syncRevision, title: record.title };
  }

  const saved = await parseJsonResponse<ResearchSessionResponse>(response);
  if (!saved) {
    return { syncRevision: input.syncRevision, title: record.title };
  }

  const synced = toLocalRecord(saved);
  applyCloudResearchSessionRecord(synced);
  return { syncRevision: saved.syncRevision, title: saved.title };
}

export async function createResearchSessionState(input?: {
  title?: string;
}): Promise<{ sessionId: string; syncRevision: number; title: string }> {
  const local = createResearchSession(input?.title);
  const payload = recordToWritePayload(local);

  const response = await persistenceFetch("/api/me/research-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schemaVersion: 1,
      id: local.id,
      ...payload,
    }),
  });

  if (response.ok) {
    const created = await parseJsonResponse<ResearchSessionResponse>(response);
    if (created) {
      const synced = toLocalRecord(created);
      applyCloudResearchSessionRecord(synced);
      setActiveResearchSession(synced.id);
      return {
        sessionId: synced.id,
        syncRevision: synced.syncRevision,
        title: synced.title,
      };
    }
  }

  return { sessionId: local.id, syncRevision: local.syncRevision, title: local.title };
}

export async function renameResearchSessionState(input: {
  sessionId: string;
  title: string;
  syncRevision: number;
}): Promise<{ title: string; syncRevision: number }> {
  const title = input.title.trim().slice(0, 200) || DEFAULT_RESEARCH_SESSION_TITLE;
  renameResearchSession(input.sessionId, title);
  return saveResearchSessionState({
    sessionId: input.sessionId,
    syncRevision: input.syncRevision,
  });
}

export async function deleteResearchSessionState(sessionId: string): Promise<void> {
  deleteResearchSession(sessionId);

  const response = await persistenceFetch(`/api/me/research-sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (isCloudUnavailable(response) || !response.ok) {
    return;
  }
}

export async function switchResearchSessionState(sessionId: string): Promise<void> {
  setActiveResearchSession(sessionId);
  await loadResearchSession(sessionId);
}

export { createSessionId, DEFAULT_RESEARCH_SESSION_TITLE };
