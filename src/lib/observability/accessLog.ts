export type AccessLogEntry = {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  requestId: string;
};

export type HttpAccessLogLine = {
  ts: string;
  event: "http.access";
  method: string;
  path: string;
  status: number;
  durationMs: number;
  requestId: string;
};

export function shouldEmitAccessLogs(): boolean {
  return process.env.NODE_ENV !== "test" && process.env.VITEST !== "true";
}

/** One redacted JSON access log line to stdout — pathname only, no query/body/cookies. */
export function logAccess(entry: AccessLogEntry): void {
  if (!shouldEmitAccessLogs()) {
    return;
  }

  const line: HttpAccessLogLine = {
    ts: new Date().toISOString(),
    event: "http.access",
    method: entry.method.toUpperCase(),
    path: sanitizeAccessPath(entry.path),
    status: entry.status,
    durationMs: Math.max(0, Math.round(entry.durationMs)),
    requestId: entry.requestId,
  };

  console.log(JSON.stringify(line));
}

/** Strip query strings and normalize to pathname only. */
export function sanitizeAccessPath(path: string): string {
  const withoutQuery = path.split("?")[0]?.split("#")[0] ?? path;
  if (!withoutQuery.startsWith("/")) {
    return `/${withoutQuery}`;
  }
  return withoutQuery;
}
