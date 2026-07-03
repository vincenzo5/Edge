import type {
  AccountExecution,
  AccountOrder,
  AccountPnL,
  AccountPosition,
  AccountStatus,
  AccountSummary,
  WhatIfRequest,
  WhatIfResult,
} from "../marketData/contracts/brokerage";
import { sidecarAuthHeaders } from "../marketData/providers/tws/sidecarAuth";
import {
  BrokerageRequestError,
  classifyBrokerageError,
  recordBrokerageFailure,
  recordBrokerageSuccess,
  shouldTryBrokerage,
} from "./brokerageHealthGate";

export type BrokerageClientConfig = {
  baseUrl: string;
  timeoutMs: number;
};

function parsePositiveMs(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function isBrokerageConfigured(): boolean {
  return true;
}

function readConfig(): BrokerageClientConfig {
  const baseUrl = process.env.TWS_SIDECAR_URL?.trim() ?? "http://127.0.0.1:8765";
  const timeoutMs = parsePositiveMs(process.env.TWS_SIDECAR_TIMEOUT_MS, 15_000);
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    timeoutMs,
  };
}

export function getBrokerageStreamUrl(baseUrl?: string): string {
  const resolved = baseUrl ?? readConfig().baseUrl;
  return `${resolved.replace(/\/$/, "")}/stream/account`;
}

/**
 * Fast liveness probe for the TWS sidecar. Hits /status with a short timeout so
 * callers fail fast (~seconds) when the sidecar process is up but unresponsive,
 * instead of waiting the full request timeout (often 60-120s) per sub-request.
 *
 * Returns true when the sidecar answers any HTTP status; false on network error
 * or timeout. This is intentionally cheap and does NOT parse the payload.
 */
export async function probeSidecarLiveness(
  config?: BrokerageClientConfig,
  timeoutMs = 2_000,
): Promise<boolean> {
  const resolved = config ?? readConfig();
  const url = `${resolved.baseUrl}/status`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function toRequestError(error: unknown): BrokerageRequestError {
  if (error instanceof BrokerageRequestError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const category = classifyBrokerageError(error);
  if (category === "request_timeout" || message.toLowerCase().includes("timeout")) {
    return new BrokerageRequestError("request_timeout", message);
  }
  return new BrokerageRequestError(category, message);
}

export function createBrokerageClient(config?: BrokerageClientConfig) {
  const resolved = config ?? readConfig();

  async function request<T>(
    pathWithQuery: string,
    options: {
      method?: "GET" | "POST";
      body?: unknown;
    } = {},
  ): Promise<T> {
    if (!isBrokerageConfigured()) {
      throw new BrokerageRequestError(
        "disabled",
        "Brokerage tracking unavailable.",
      );
    }
    if (!shouldTryBrokerage()) {
      throw new BrokerageRequestError(
        "request_failed",
        "Brokerage requests temporarily skipped after repeated failures",
      );
    }

    const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
    const url = `${resolved.baseUrl}${path}`;
    const method = options.method ?? "GET";
    try {
      const res = await fetch(url, {
        method,
        headers: sidecarAuthHeaders(
          options.body != null
            ? { "Content-Type": "application/json", Accept: "application/json" }
            : { Accept: "application/json" },
        ),
        body: options.body != null ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(resolved.timeoutMs),
      });
      const text = await res.text();
      let json: unknown = null;
      if (text) {
        try {
          json = JSON.parse(text) as unknown;
        } catch {
          json = text;
        }
      }
      if (!res.ok) {
        const detail =
          typeof json === "object" &&
          json != null &&
          "detail" in json &&
          typeof (json as { detail?: unknown }).detail === "string"
            ? (json as { detail: string }).detail
            : text || `${method} ${path} failed (${res.status})`;
        throw toRequestError(new Error(detail));
      }
      recordBrokerageSuccess();
      return json as T;
    } catch (error) {
      recordBrokerageFailure(error);
      throw toRequestError(error);
    }
  }

  return {
    getConfig() {
      return resolved;
    },

    /** Fast sidecar liveness check (short timeout). Does not touch IB Gateway. */
    async probeLiveness(timeoutMs = 2_000): Promise<boolean> {
      return probeSidecarLiveness(resolved, timeoutMs);
    },

    async getStatus(): Promise<AccountStatus> {
      return request<AccountStatus>("/account/status");
    },

    async getSummary(): Promise<AccountSummary> {
      return request<AccountSummary>("/account/summary");
    },

    async getPositions(): Promise<{ positions: AccountPosition[]; updatedAt: number }> {
      return request<{ positions: AccountPosition[]; updatedAt: number }>(
        "/account/positions",
      );
    },

    async getPnL(): Promise<AccountPnL> {
      return request<AccountPnL>("/account/pnl");
    },

    async getOrders(): Promise<{ orders: AccountOrder[]; updatedAt: number }> {
      return request<{ orders: AccountOrder[]; updatedAt: number }>("/account/orders");
    },

    async getTrades(): Promise<{ executions: AccountExecution[]; updatedAt: number }> {
      return request<{ executions: AccountExecution[]; updatedAt: number }>(
        "/account/trades",
      );
    },

    async whatIfOrder(body: WhatIfRequest): Promise<WhatIfResult> {
      return request<WhatIfResult>("/account/whatif", {
        method: "POST",
        body: body,
      });
    },
  };
}

export type BrokerageClient = ReturnType<typeof createBrokerageClient>;

let singletonClient: BrokerageClient | null = null;

export function getBrokerageClient(): BrokerageClient | null {
  if (!isBrokerageConfigured()) return null;
  if (!singletonClient) {
    singletonClient = createBrokerageClient();
  }
  return singletonClient;
}

export { BrokerageRequestError };
