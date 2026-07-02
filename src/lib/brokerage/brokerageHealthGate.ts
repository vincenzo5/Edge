export type BrokerageErrorCategory =
  | "disabled"
  | "sidecar_unreachable"
  | "gateway_disconnected"
  | "request_timeout"
  | "request_failed";

export class BrokerageRequestError extends Error {
  readonly category: BrokerageErrorCategory;

  constructor(category: BrokerageErrorCategory, message: string) {
    super(message);
    this.name = "BrokerageRequestError";
    this.category = category;
  }
}

export function classifyBrokerageError(error: unknown): BrokerageErrorCategory {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("disabled") || message.includes("tws_brokerage_enabled")) {
    return "disabled";
  }
  if (message.includes("timeout") || message.includes("aborted")) {
    return "request_timeout";
  }
  if (message.includes("not connected") || message.includes("gateway")) {
    return "gateway_disconnected";
  }
  if (message.includes("fetch failed") || message.includes("econnrefused")) {
    return "sidecar_unreachable";
  }
  return "request_failed";
}

type GateState = {
  skipUntil: number;
  lastFailure: string | null;
  failureCount: number;
  lastSuccessAt: number;
};

const DEFAULT_COOLDOWN_MS = 15_000;
const MAX_FAILURES = 3;

let gate: GateState = {
  skipUntil: 0,
  lastFailure: null,
  failureCount: 0,
  lastSuccessAt: 0,
};

export function shouldTryBrokerage(): boolean {
  return Date.now() >= gate.skipUntil;
}

export function recordBrokerageSuccess(): void {
  gate = {
    skipUntil: 0,
    lastFailure: null,
    failureCount: 0,
    lastSuccessAt: Date.now(),
  };
}

export function recordBrokerageFailure(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const failureCount = gate.failureCount + 1;
  gate = {
    skipUntil:
      failureCount >= MAX_FAILURES ? Date.now() + DEFAULT_COOLDOWN_MS : gate.skipUntil,
    lastFailure: message,
    failureCount,
    lastSuccessAt: gate.lastSuccessAt,
  };
}

export function resetBrokerageHealthGate(): void {
  gate = {
    skipUntil: 0,
    lastFailure: null,
    failureCount: 0,
    lastSuccessAt: Date.now(),
  };
}

export function getBrokerageHealthGateSnapshot(): GateState {
  return { ...gate };
}
