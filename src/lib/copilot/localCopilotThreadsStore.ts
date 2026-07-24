import type { CopilotThreadSummary } from "@/lib/persistence/schemas/copilotThreads";
import type { PersistedCopilotMessage } from "@/lib/persistence/schemas/copilotThreads";

export const COPILOT_THREADS_LOCAL_STORAGE_KEY = "tv-ai:copilot-threads:v1";

export type LocalCopilotThreadRecord = {
  id: string;
  title: string;
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  messages: PersistedCopilotMessage[];
  modelId?: string;
  archivedAt?: string | null;
};

export type LocalCopilotThreadsSnapshot = {
  schemaVersion: 1;
  activeThreadId: string | null;
  threads: Record<string, LocalCopilotThreadRecord>;
};

function emptySnapshot(): LocalCopilotThreadsSnapshot {
  return {
    schemaVersion: 1,
    activeThreadId: null,
    threads: {},
  };
}

function hasLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readLocalCopilotThreadsSnapshot(): LocalCopilotThreadsSnapshot {
  if (!hasLocalStorage()) return emptySnapshot();
  try {
    const raw = window.localStorage.getItem(COPILOT_THREADS_LOCAL_STORAGE_KEY);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as LocalCopilotThreadsSnapshot;
    if (parsed?.schemaVersion !== 1 || !parsed.threads || typeof parsed.threads !== "object") {
      return emptySnapshot();
    }
    return {
      schemaVersion: 1,
      activeThreadId: parsed.activeThreadId ?? null,
      threads: parsed.threads,
    };
  } catch {
    return emptySnapshot();
  }
}

export function writeLocalCopilotThreadsSnapshot(snapshot: LocalCopilotThreadsSnapshot): void {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(COPILOT_THREADS_LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
}

export function upsertLocalCopilotThread(record: LocalCopilotThreadRecord): LocalCopilotThreadsSnapshot {
  const snapshot = readLocalCopilotThreadsSnapshot();
  snapshot.threads[record.id] = record;
  writeLocalCopilotThreadsSnapshot(snapshot);
  return snapshot;
}

export function setLocalActiveThreadId(threadId: string | null): LocalCopilotThreadsSnapshot {
  const snapshot = readLocalCopilotThreadsSnapshot();
  snapshot.activeThreadId = threadId;
  writeLocalCopilotThreadsSnapshot(snapshot);
  return snapshot;
}

export function archiveLocalCopilotThread(threadId: string): LocalCopilotThreadsSnapshot {
  const snapshot = readLocalCopilotThreadsSnapshot();
  const existing = snapshot.threads[threadId];
  if (existing) {
    snapshot.threads[threadId] = {
      ...existing,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  if (snapshot.activeThreadId === threadId) {
    const nextActive = listLocalCopilotThreadSummaries(snapshot).find(
      (entry) => entry.id !== threadId,
    );
    snapshot.activeThreadId = nextActive?.id ?? null;
  }
  writeLocalCopilotThreadsSnapshot(snapshot);
  return snapshot;
}

export function getLocalCopilotThread(threadId: string): LocalCopilotThreadRecord | null {
  const snapshot = readLocalCopilotThreadsSnapshot();
  return snapshot.threads[threadId] ?? null;
}

export function listLocalCopilotThreadSummaries(
  snapshot: LocalCopilotThreadsSnapshot = readLocalCopilotThreadsSnapshot(),
): CopilotThreadSummary[] {
  return Object.values(snapshot.threads)
    .filter((thread) => !thread.archivedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((thread) => ({
      id: thread.id,
      title: thread.title,
      schemaVersion: 1 as const,
      syncRevision: thread.syncRevision,
      updatedAt: thread.updatedAt,
      messageCount: thread.messages.length,
    }));
}

export function clearLocalCopilotThreads(): void {
  if (!hasLocalStorage()) return;
  window.localStorage.removeItem(COPILOT_THREADS_LOCAL_STORAGE_KEY);
}
