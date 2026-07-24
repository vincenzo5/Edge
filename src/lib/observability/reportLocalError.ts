export const LOCAL_ERRORS_API_PATH = "/api/dev/local-errors";

export type ReportLocalErrorInput = {
  source: string;
  message: string;
  stack?: string;
  detail?: string;
};

const DEDUPE_MS = 5000;
const recentKeys = new Map<string, number>();
let posting = false;

function dedupeKey(input: ReportLocalErrorInput): string {
  return `${input.source}:${input.message}`;
}

function shouldSkipInput(input: ReportLocalErrorInput): boolean {
  if (posting) return true;
  if (input.message.includes(LOCAL_ERRORS_API_PATH)) return true;
  const key = dedupeKey(input);
  const now = Date.now();
  const last = recentKeys.get(key);
  if (last != null && now - last < DEDUPE_MS) return true;
  recentKeys.set(key, now);
  return false;
}

/** Fire-and-forget client report to the local error log ingest route. */
export function reportLocalError(input: ReportLocalErrorInput): void {
  if (typeof window === "undefined") return;
  if (shouldSkipInput(input)) return;

  posting = true;
  void fetch(LOCAL_ERRORS_API_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    keepalive: true,
  })
    .catch(() => {
      // Swallow — local diagnostics must not disturb the app.
    })
    .finally(() => {
      posting = false;
    });
}

/** Reset dedupe state for tests. */
export function resetReportLocalErrorForTests(): void {
  recentKeys.clear();
  posting = false;
}
