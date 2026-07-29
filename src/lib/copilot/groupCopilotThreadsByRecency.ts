import type { CopilotThreadSummary } from "@/lib/persistence/schemas/copilotThreads";

export type CopilotThreadRecencyBucket = "today" | "yesterday" | "earlier";

export type CopilotThreadRecencyGroup = {
  bucket: CopilotThreadRecencyBucket;
  label: string;
  threads: CopilotThreadSummary[];
};

export const COPILOT_HISTORY_RAIL_VISIBLE_LIMIT = 15;
export const COPILOT_HISTORY_RAIL_COLLAPSED_KEY = "tv-ai:copilot-history-rail:collapsed";

const BUCKET_LABELS: Record<CopilotThreadRecencyBucket, string> = {
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier",
};

const BUCKET_ORDER: CopilotThreadRecencyBucket[] = ["today", "yesterday", "earlier"];

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function getCopilotThreadRecencyBucket(
  updatedAt: string,
  now: Date = new Date(),
): CopilotThreadRecencyBucket {
  const updatedDay = startOfLocalDay(new Date(updatedAt));
  const today = startOfLocalDay(now);
  const yesterday = today - 86_400_000;

  if (updatedDay === today) return "today";
  if (updatedDay === yesterday) return "yesterday";
  return "earlier";
}

export function sortCopilotThreadsByRecency(
  threads: CopilotThreadSummary[],
): CopilotThreadSummary[] {
  return [...threads].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export function groupCopilotThreadsByRecency(
  threads: CopilotThreadSummary[],
  now: Date = new Date(),
): CopilotThreadRecencyGroup[] {
  const sorted = sortCopilotThreadsByRecency(threads);
  const grouped = new Map<CopilotThreadRecencyBucket, CopilotThreadSummary[]>();

  for (const thread of sorted) {
    const bucket = getCopilotThreadRecencyBucket(thread.updatedAt, now);
    const existing = grouped.get(bucket) ?? [];
    existing.push(thread);
    grouped.set(bucket, existing);
  }

  return BUCKET_ORDER.filter((bucket) => grouped.has(bucket)).map((bucket) => ({
    bucket,
    label: BUCKET_LABELS[bucket],
    threads: grouped.get(bucket)!,
  }));
}

export function limitCopilotThreads(
  threads: CopilotThreadSummary[],
  limit: number = COPILOT_HISTORY_RAIL_VISIBLE_LIMIT,
): { visible: CopilotThreadSummary[]; hasMore: boolean } {
  const sorted = sortCopilotThreadsByRecency(threads);
  return {
    visible: sorted.slice(0, limit),
    hasMore: sorted.length > limit,
  };
}

export function readCopilotHistoryRailCollapsed(): boolean {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(COPILOT_HISTORY_RAIL_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeCopilotHistoryRailCollapsed(collapsed: boolean): void {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(COPILOT_HISTORY_RAIL_COLLAPSED_KEY, collapsed ? "true" : "false");
  } catch {
    // ignore quota / privacy mode
  }
}
