import {
  readLocalCopilotThreadsSnapshot,
  type LocalCopilotThreadsSnapshot,
} from "@/lib/copilot/localCopilotThreadsStore";
import { sortCopilotThreadsByRecency } from "@/lib/copilot/groupCopilotThreadsByRecency";
import type { CopilotThreadSummary } from "@/lib/persistence/schemas/copilotThreads";

export type CopilotThreadSearchResult = {
  thread: CopilotThreadSummary;
  snippet?: string;
};

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function findMessageSnippet(
  snapshot: LocalCopilotThreadsSnapshot,
  threadId: string,
  normalizedQuery: string,
): string | undefined {
  const record = snapshot.threads[threadId];
  if (!record) return undefined;

  for (const message of record.messages) {
    const content = message.content.trim();
    if (!content) continue;
    const normalizedContent = content.toLowerCase();
    if (!normalizedContent.includes(normalizedQuery)) continue;

    const matchIndex = normalizedContent.indexOf(normalizedQuery);
    const start = Math.max(0, matchIndex - 40);
    const end = Math.min(content.length, matchIndex + normalizedQuery.length + 60);
    const prefix = start > 0 ? "…" : "";
    const suffix = end < content.length ? "…" : "";
    return `${prefix}${content.slice(start, end)}${suffix}`;
  }

  return undefined;
}

export function searchCopilotThreads(
  threads: CopilotThreadSummary[],
  query: string,
  snapshot: LocalCopilotThreadsSnapshot = readLocalCopilotThreadsSnapshot(),
): CopilotThreadSearchResult[] {
  const sorted = sortCopilotThreadsByRecency(threads);
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return sorted.map((thread) => ({ thread }));
  }

  const results: CopilotThreadSearchResult[] = [];

  for (const thread of sorted) {
    const titleMatch = thread.title.toLowerCase().includes(normalizedQuery);
    const snippet = findMessageSnippet(snapshot, thread.id, normalizedQuery);
    if (titleMatch || snippet) {
      results.push({
        thread,
        snippet: snippet ?? (titleMatch ? thread.title : undefined),
      });
    }
  }

  return results;
}

export function formatCopilotRelativeTime(
  updatedAt: string,
  now: Date = new Date(),
): string {
  const updated = new Date(updatedAt);
  const diffMs = Math.max(0, now.getTime() - updated.getTime());
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return updated.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
