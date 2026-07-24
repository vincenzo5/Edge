import { EDGE_AI_DEFAULT_MODEL_FALLBACK } from "@/lib/ai/model/allowlist";
import type { CopilotMessage } from "@/lib/copilot/types";
import {
  DEFAULT_THREAD_TITLE,
  deriveThreadTitle,
  hydrateMessagesFromPersist,
  redactMessagesForPersist,
} from "@/lib/copilot/copilotThreadRedact";
import {
  archiveLocalCopilotThread,
  getLocalCopilotThread,
  listLocalCopilotThreadSummaries,
  readLocalCopilotThreadsSnapshot,
  setLocalActiveThreadId,
  upsertLocalCopilotThread,
  type LocalCopilotThreadRecord,
} from "@/lib/copilot/localCopilotThreadsStore";
import { persistenceFetch } from "@/lib/persistence/client/persistenceFetch";
import type {
  CopilotThreadResponse,
  CopilotThreadSummary,
} from "@/lib/persistence/schemas/copilotThreads";

function createThreadId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `thread-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toLocalRecord(input: {
  id: string;
  title: string;
  messages: CopilotMessage[];
  syncRevision: number;
  updatedAt?: string;
  modelId?: string;
}): LocalCopilotThreadRecord {
  return {
    id: input.id,
    title: input.title,
    schemaVersion: 1,
    syncRevision: input.syncRevision,
    updatedAt: input.updatedAt ?? nowIso(),
    messages: redactMessagesForPersist(input.messages),
    ...(input.modelId ? { modelId: input.modelId } : {}),
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

export async function listCopilotThreadSummaries(): Promise<CopilotThreadSummary[]> {
  const response = await persistenceFetch("/api/me/copilot-threads");
  if (isCloudUnavailable(response)) {
    return listLocalCopilotThreadSummaries();
  }
  if (!response.ok) {
    return listLocalCopilotThreadSummaries();
  }
  const json = await parseJsonResponse<{ threads: CopilotThreadSummary[] }>(response);
  return json?.threads ?? listLocalCopilotThreadSummaries();
}

export async function loadCopilotThread(
  threadId: string,
): Promise<{ record: LocalCopilotThreadRecord; source: "local" | "cloud" } | null> {
  const local = getLocalCopilotThread(threadId);
  const response = await persistenceFetch(`/api/me/copilot-threads/${threadId}`);
  if (isCloudUnavailable(response)) {
    return local ? { record: local, source: "local" } : null;
  }
  if (response.status === 404) {
    return local ? { record: local, source: "local" } : null;
  }
  if (!response.ok) {
    return local ? { record: local, source: "local" } : null;
  }

  const cloud = await parseJsonResponse<CopilotThreadResponse>(response);
  if (!cloud) {
    return local ? { record: local, source: "local" } : null;
  }

  const cloudRecord: LocalCopilotThreadRecord = {
    id: cloud.id,
    title: cloud.title,
    schemaVersion: 1,
    syncRevision: cloud.syncRevision,
    updatedAt: cloud.updatedAt,
    messages: cloud.messages,
    archivedAt: local?.archivedAt ?? null,
    ...(cloud.modelId ? { modelId: cloud.modelId } : {}),
  };

  if (!local || cloud.syncRevision >= local.syncRevision) {
    upsertLocalCopilotThread(cloudRecord);
    return { record: cloudRecord, source: "cloud" };
  }

  return { record: local, source: "local" };
}

export async function hydrateCopilotThreadsState(): Promise<{
  activeThreadId: string;
  messages: CopilotMessage[];
  threads: CopilotThreadSummary[];
  syncRevision: number;
  title: string;
  modelId: string;
}> {
  const snapshot = readLocalCopilotThreadsSnapshot();
  let summaries = listLocalCopilotThreadSummaries(snapshot);
  const cloudSummaries = await listCopilotThreadSummaries();
  if (cloudSummaries.length > 0) {
    summaries = cloudSummaries;
  }

  let activeThreadId = snapshot.activeThreadId;
  if (!activeThreadId || !summaries.some((entry) => entry.id === activeThreadId)) {
    activeThreadId = summaries[0]?.id ?? createThreadId();
  }

  const loaded = await loadCopilotThread(activeThreadId);
  if (loaded) {
    setLocalActiveThreadId(activeThreadId);
    return {
      activeThreadId,
      messages: hydrateMessagesFromPersist(loaded.record.messages),
      threads: summaries,
      syncRevision: loaded.record.syncRevision,
      title: loaded.record.title,
      modelId: loaded.record.modelId ?? EDGE_AI_DEFAULT_MODEL_FALLBACK,
    };
  }

  const emptyRecord = toLocalRecord({
    id: activeThreadId,
    title: DEFAULT_THREAD_TITLE,
    messages: [],
    syncRevision: 1,
    modelId: EDGE_AI_DEFAULT_MODEL_FALLBACK,
  });
  upsertLocalCopilotThread(emptyRecord);
  setLocalActiveThreadId(activeThreadId);
  return {
    activeThreadId,
    messages: [],
    threads: listLocalCopilotThreadSummaries(),
    syncRevision: 1,
    title: DEFAULT_THREAD_TITLE,
    modelId: EDGE_AI_DEFAULT_MODEL_FALLBACK,
  };
}

export async function saveCopilotThreadState(input: {
  threadId: string;
  title: string;
  messages: CopilotMessage[];
  syncRevision: number;
  modelId?: string;
}): Promise<{ syncRevision: number; title: string }> {
  const title = deriveThreadTitle(input.messages, input.title);
  const localRecord = toLocalRecord({
    id: input.threadId,
    title,
    messages: input.messages,
    syncRevision: input.syncRevision,
    modelId: input.modelId,
  });
  upsertLocalCopilotThread(localRecord);
  setLocalActiveThreadId(input.threadId);

  const response = await persistenceFetch(`/api/me/copilot-threads/${input.threadId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schemaVersion: 1,
      baseRevision: input.syncRevision,
      title,
      messages: localRecord.messages,
      ...(input.modelId ? { modelId: input.modelId } : {}),
    }),
  });

  if (isCloudUnavailable(response) || response.status === 404) {
    if (response.status === 404) {
      const createResponse = await persistenceFetch("/api/me/copilot-threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          id: input.threadId,
          title,
          messages: localRecord.messages,
          ...(input.modelId ? { modelId: input.modelId } : {}),
        }),
      });
      if (createResponse.ok) {
        const created = await parseJsonResponse<CopilotThreadResponse>(createResponse);
        if (created) {
          const synced = toLocalRecord({
            id: created.id,
            title: created.title,
            messages: hydrateMessagesFromPersist(created.messages),
            syncRevision: created.syncRevision,
            updatedAt: created.updatedAt,
            modelId: created.modelId ?? input.modelId,
          });
          upsertLocalCopilotThread(synced);
          return { syncRevision: created.syncRevision, title: created.title };
        }
      }
    }
    return { syncRevision: input.syncRevision, title };
  }

  if (response.status === 409) {
    const conflict = await parseJsonResponse<{
      current?: { syncRevision: number; updatedAt: string; title?: string; messages?: unknown };
    }>(response);
    const currentRevision = conflict?.current?.syncRevision;
    if (typeof currentRevision === "number") {
      const retry = await persistenceFetch(`/api/me/copilot-threads/${input.threadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          baseRevision: currentRevision,
          title,
          messages: localRecord.messages,
          ...(input.modelId ? { modelId: input.modelId } : {}),
        }),
      });
      if (retry.ok) {
        const saved = await parseJsonResponse<CopilotThreadResponse>(retry);
        if (saved) {
          const synced = toLocalRecord({
            id: saved.id,
            title: saved.title,
            messages: hydrateMessagesFromPersist(saved.messages),
            syncRevision: saved.syncRevision,
            updatedAt: saved.updatedAt,
            modelId: saved.modelId ?? input.modelId,
          });
          upsertLocalCopilotThread(synced);
          return { syncRevision: saved.syncRevision, title: saved.title };
        }
      }
    }
    return { syncRevision: input.syncRevision, title };
  }

  if (!response.ok) {
    return { syncRevision: input.syncRevision, title };
  }

  const saved = await parseJsonResponse<CopilotThreadResponse>(response);
  if (!saved) {
    return { syncRevision: input.syncRevision, title };
  }

  const synced = toLocalRecord({
    id: saved.id,
    title: saved.title,
    messages: hydrateMessagesFromPersist(saved.messages),
    syncRevision: saved.syncRevision,
    updatedAt: saved.updatedAt,
    modelId: saved.modelId ?? input.modelId,
  });
  upsertLocalCopilotThread(synced);
  return { syncRevision: saved.syncRevision, title: saved.title };
}

export async function createCopilotThreadState(input?: {
  title?: string;
  modelId?: string;
}): Promise<{ threadId: string; syncRevision: number; title: string; modelId: string }> {
  const threadId = createThreadId();
  const title = input?.title?.trim() || DEFAULT_THREAD_TITLE;
  const modelId = input?.modelId ?? EDGE_AI_DEFAULT_MODEL_FALLBACK;
  const record = toLocalRecord({
    id: threadId,
    title,
    messages: [],
    syncRevision: 1,
    modelId,
  });
  upsertLocalCopilotThread(record);
  setLocalActiveThreadId(threadId);

  const response = await persistenceFetch("/api/me/copilot-threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schemaVersion: 1,
      id: threadId,
      title,
      messages: [],
      modelId,
    }),
  });

  if (response.ok) {
    const created = await parseJsonResponse<CopilotThreadResponse>(response);
    if (created) {
      const synced = toLocalRecord({
        id: created.id,
        title: created.title,
        messages: [],
        syncRevision: created.syncRevision,
        updatedAt: created.updatedAt,
        modelId: created.modelId ?? modelId,
      });
      upsertLocalCopilotThread(synced);
      return {
        threadId: created.id,
        syncRevision: created.syncRevision,
        title: created.title,
        modelId: created.modelId ?? modelId,
      };
    }
  }

  return { threadId, syncRevision: 1, title, modelId };
}

export async function renameCopilotThreadState(input: {
  threadId: string;
  title: string;
  messages: CopilotMessage[];
  syncRevision: number;
  modelId?: string;
}): Promise<{ title: string; syncRevision: number }> {
  const title = input.title.trim().slice(0, 120) || DEFAULT_THREAD_TITLE;
  return saveCopilotThreadState({
    threadId: input.threadId,
    title,
    messages: input.messages,
    syncRevision: input.syncRevision,
    modelId: input.modelId,
  });
}

export async function deleteCopilotThreadState(threadId: string): Promise<void> {
  archiveLocalCopilotThread(threadId);

  const response = await persistenceFetch(`/api/me/copilot-threads/${threadId}`, {
    method: "DELETE",
  });
  if (isCloudUnavailable(response) || !response.ok) {
    return;
  }
}

export { createThreadId, DEFAULT_THREAD_TITLE };
