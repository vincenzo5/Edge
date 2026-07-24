import { redactDiagnostic } from "@/lib/api/redactDiagnostic";
import type { RouteAttempt, RouteDecision } from "./observation";

const MAX_DETAIL_LENGTH = 120;

/** Redact and truncate route detail strings for diagnostics. */
export function sanitizeRouteDetail(detail: string | undefined): string | undefined {
  if (!detail) return undefined;
  const sanitized = redactDiagnostic(detail, { maxLength: MAX_DETAIL_LENGTH });
  return sanitized || undefined;
}

/** Collects provider route attempts during a service waterfall. */
export class RouteCollector {
  private attempts: RouteAttempt[] = [];

  recordSkipped(provider: string, reason: string, at = Date.now()): void {
    this.attempts.push({
      provider,
      startedAt: at,
      finishedAt: at,
      ok: false,
      failureCategory: "skipped",
      detail: sanitizeRouteDetail(reason),
    });
  }

  recordEmpty(provider: string, startedAt: number, finishedAt = Date.now()): void {
    this.attempts.push({
      provider,
      startedAt,
      finishedAt,
      ok: false,
      failureCategory: "empty",
    });
  }

  recordFailure(
    provider: string,
    startedAt: number,
    error: unknown,
    finishedAt = Date.now(),
  ): void {
    const message = error instanceof Error ? error.message : String(error);
    this.attempts.push({
      provider,
      startedAt,
      finishedAt,
      ok: false,
      failureCategory: "failure",
      detail: sanitizeRouteDetail(message),
    });
  }

  recordSuccess(provider: string, startedAt: number, finishedAt = Date.now()): void {
    this.attempts.push({
      provider,
      startedAt,
      finishedAt,
      ok: true,
    });
  }

  buildDecision(selected: string, fallbackReason?: string): RouteDecision {
    const attempted = [...new Set([...this.attempts.map((a) => a.provider), selected])];
    return {
      attempted,
      selected,
      fallbackReason: sanitizeRouteDetail(fallbackReason),
      attempts: [...this.attempts],
    };
  }

  getAttempts(): readonly RouteAttempt[] {
    return this.attempts;
  }
}
