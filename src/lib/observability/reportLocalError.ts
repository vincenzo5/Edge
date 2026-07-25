export const LOCAL_ERRORS_API_PATH = "/api/dev/local-errors";
export const PRODUCTION_ERRORS_API_PATH = "/api/me/production-errors";

export type ReportLocalErrorInput = {
  source: string;
  message: string;
  stack?: string;
  detail?: string;
};

const DEDUPE_MS = 5000;
const recentKeys = new Map<string, number>();
let posting = false;

function isProductionClient(): boolean {
  return process.env.NODE_ENV === "production";
}

function resolveIngestPath(): string {
  return isProductionClient() ? PRODUCTION_ERRORS_API_PATH : LOCAL_ERRORS_API_PATH;
}

function dedupeKey(input: ReportLocalErrorInput): string {
  return `${input.source}:${input.message}`;
}

function shouldSkipInput(input: ReportLocalErrorInput): boolean {
  if (posting) return true;
  if (input.message.includes(LOCAL_ERRORS_API_PATH)) return true;
  if (input.message.includes(PRODUCTION_ERRORS_API_PATH)) return true;
  const key = dedupeKey(input);
  const now = Date.now();
  const last = recentKeys.get(key);
  if (last != null && now - last < DEDUPE_MS) return true;
  recentKeys.set(key, now);
  return false;
}

/** Fire-and-forget client report to the local or production error ingest route. */
export function reportLocalError(input: ReportLocalErrorInput): void {
  if (typeof window === "undefined") return;
  if (shouldSkipInput(input)) return;

  const ingestPath = resolveIngestPath();
  posting = true;
  void fetch(ingestPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    keepalive: true,
    credentials: isProductionClient() ? "include" : "same-origin",
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
