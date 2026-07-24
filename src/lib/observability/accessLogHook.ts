import "server-only";

import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { logAccess } from "./accessLog";
import { getRequestIdHeaderName, resolveRequestId } from "./requestIdCore";
import { runWithRequestId } from "./requestIdContext";

let hookRegistered = false;

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function readPathname(req: IncomingMessage): string {
  const raw = req.url ?? "/";
  try {
    return new URL(raw, "http://localhost").pathname;
  } catch {
    return sanitizePathFallback(raw);
  }
}

function sanitizePathFallback(raw: string): string {
  return raw.split("?")[0]?.split("#")[0] ?? raw;
}

function attachAccessLog(req: IncomingMessage, res: ServerResponse, requestId: string): void {
  const startedAt = Date.now();
  const pathname = readPathname(req);
  const method = req.method ?? "GET";

  res.on("finish", () => {
    logAccess({
      method,
      path: pathname,
      status: res.statusCode || 200,
      durationMs: Date.now() - startedAt,
      requestId,
    });
  });
}

function headersFromIncomingMessage(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const part of value) {
        headers.append(key, part);
      }
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

/** Idempotent Node HTTP hook — one access log line per /api request on res.finish. */
export function registerAccessLogHook(): void {
  if (hookRegistered) {
    return;
  }
  hookRegistered = true;

  const originalEmit = http.Server.prototype.emit;

  http.Server.prototype.emit = function emitWithAccessLog(
    this: http.Server,
    event: string,
    ...args: unknown[]
  ): boolean {
    if (event === "request") {
      const req = args[0] as IncomingMessage;
      const res = args[1] as ServerResponse;
      const pathname = readPathname(req);

      if (isApiPath(pathname)) {
        const requestId = resolveRequestId(headersFromIncomingMessage(req));
        const headerName = getRequestIdHeaderName();
        if (!res.getHeader(headerName)) {
          res.setHeader(headerName, requestId);
        }
        attachAccessLog(req, res, requestId);
        return runWithRequestId(requestId, () =>
          Reflect.apply(originalEmit, this, [event, ...args]),
        );
      }
    }

    return Reflect.apply(originalEmit, this, [event, ...args]);
  };
}

/** Test-only reset — restores default emit and clears registration flag. */
export function resetAccessLogHookForTests(): void {
  hookRegistered = false;
}
