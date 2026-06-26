/** Process-local IBKR Client Portal circuit breaker — skips repeated auth failures. */

export type IbkrFailureCategory =
  | "auth_failure"
  | "gateway_unreachable"
  | "provider_error";

export type IbkrWorkload = "candles" | "quotes" | "options" | "status";

const COOLDOWN_MS: Record<IbkrFailureCategory, number> = {
  auth_failure: 45_000,
  gateway_unreachable: 60_000,
  provider_error: 15_000,
};

export function classifyIbkrError(error: unknown): IbkrFailureCategory {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (
    message.includes("401") ||
    message.includes("unauthorized") ||
    message.includes("not authenticated") ||
    message.includes("authentication required")
  ) {
    return "auth_failure";
  }
  if (
    message.includes("fetch failed") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("gateway not reachable")
  ) {
    return "gateway_unreachable";
  }
  return "provider_error";
}

export class IbkrHealthGate {
  private skipUntil = 0;
  private lastFailure: IbkrFailureCategory | null = null;
  private failureCount = 0;
  private lastSuccessAt = 0;

  shouldTryIbkr(_workload?: IbkrWorkload): boolean {
    return Date.now() >= this.skipUntil;
  }

  recordSuccess(): void {
    this.skipUntil = 0;
    this.lastFailure = null;
    this.failureCount = 0;
    this.lastSuccessAt = Date.now();
  }

  recordFailure(category: IbkrFailureCategory): void {
    this.lastFailure = category;
    this.failureCount += 1;
    this.skipUntil = Date.now() + COOLDOWN_MS[category];
  }

  recordUnauthenticated(): void {
    this.recordFailure("auth_failure");
  }

  getSkipReason(): string | null {
    if (this.shouldTryIbkr()) {
      return null;
    }
    const label = this.lastFailure ?? "unknown";
    const remainingSec = Math.max(0, Math.ceil((this.skipUntil - Date.now()) / 1000));
    return `IBKR temporarily skipped (${label}); retry in ~${remainingSec}s`;
  }

  snapshot(): {
    skipUntil: number;
    lastFailure: IbkrFailureCategory | null;
    failureCount: number;
    lastSuccessAt: number;
  } {
    return {
      skipUntil: this.skipUntil,
      lastFailure: this.lastFailure,
      failureCount: this.failureCount,
      lastSuccessAt: this.lastSuccessAt,
    };
  }

  reset(): void {
    this.skipUntil = 0;
    this.lastFailure = null;
    this.failureCount = 0;
    this.lastSuccessAt = 0;
  }
}

/** Singleton used by MarketDataService routing. */
export const ibkrHealthGate = new IbkrHealthGate();

export function resetIbkrHealthGateForTests(): void {
  ibkrHealthGate.reset();
}
