/** Process-local TWS circuit breaker — skips repeated slow/failed TWS attempts. */

export type TwsFailureCategory =
  | "sidecar_unreachable"
  | "gateway_disconnected"
  | "request_timeout"
  | "provider_error"
  | "provider_empty";

export type TwsWorkload = "candles" | "quotes" | "options" | "status";

const COOLDOWN_MS: Record<Exclude<TwsFailureCategory, "provider_empty">, number> = {
  sidecar_unreachable: 60_000,
  gateway_disconnected: 45_000,
  request_timeout: 30_000,
  provider_error: 15_000,
};

export class TwsRequestError extends Error {
  readonly category: TwsFailureCategory;

  constructor(category: TwsFailureCategory, message: string) {
    super(message);
    this.name = "TwsRequestError";
    this.category = category;
  }
}

export function classifyTwsError(error: unknown): TwsFailureCategory {
  if (error instanceof TwsRequestError) {
    return error.category;
  }
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (
    message.includes("timeout") ||
    message.includes("aborted") ||
    message.includes("abort")
  ) {
    return "request_timeout";
  }
  if (
    message.includes("sidecar unreachable") ||
    message.includes("fetch failed") ||
    message.includes("econnrefused") ||
    message.includes("enotfound")
  ) {
    return "sidecar_unreachable";
  }
  if (
    message.includes("not connected") ||
    message.includes("gateway") ||
    message.includes("unable to connect")
  ) {
    return "gateway_disconnected";
  }
  return "provider_error";
}

export class TwsHealthGate {
  private skipUntil = 0;
  private lastFailure: TwsFailureCategory | null = null;
  private failureCount = 0;
  private lastSuccessAt = 0;

  shouldTryTws(_workload?: TwsWorkload): boolean {
    return Date.now() >= this.skipUntil;
  }

  recordSuccess(): void {
    this.skipUntil = 0;
    this.lastFailure = null;
    this.failureCount = 0;
    this.lastSuccessAt = Date.now();
  }

  recordFailure(category: TwsFailureCategory): void {
    if (category === "provider_empty") {
      return;
    }
    this.lastFailure = category;
    this.failureCount += 1;
    this.skipUntil = Date.now() + COOLDOWN_MS[category];
  }

  getSkipReason(): string | null {
    if (this.shouldTryTws()) {
      return null;
    }
    const label = this.lastFailure ?? "unknown";
    const remainingSec = Math.max(0, Math.ceil((this.skipUntil - Date.now()) / 1000));
    return `TWS temporarily skipped (${label}); retry in ~${remainingSec}s`;
  }

  snapshot(): {
    skipUntil: number;
    lastFailure: TwsFailureCategory | null;
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
export const twsHealthGate = new TwsHealthGate();

export function resetTwsHealthGateForTests(): void {
  twsHealthGate.reset();
}
