import { asFiniteNumber } from "../../validation/parseRequest";
import { sidecarAuthHeaders } from "./sidecarAuth";
import { TwsRequestError, classifyTwsError } from "./healthGate";

export type TwsSidecarCapabilities = {
  controlRecovery?: boolean;
  controlReconnect?: boolean;
  streamQuotes?: boolean;
  brokerage?: boolean;
};

export type TwsHealthProbe = {
  ok: boolean;
  timestamp?: number;
  startedAt?: number;
  version?: string;
  host?: string;
  port?: number;
  clientId?: number;
  sidecarPort?: number;
  pid?: number;
  instanceId?: string;
  managedBy?: string;
  capabilities?: TwsSidecarCapabilities;
};

/** True when sidecar responds but lacks current-source route capabilities. */
export function isStaleTwsSidecarHealth(health: TwsHealthProbe | null | undefined): boolean {
  if (!health?.ok) return true;
  return health.capabilities?.controlRecovery !== true;
}

export type TwsClientConfig = {
  baseUrl: string;
  timeoutMs: number;
  candlesTimeoutMs: number;
  quotesTimeoutMs: number;
  optionsTimeoutMs: number;
};

export type TwsRequestKind = "candles" | "quotes" | "options" | "status" | "warmup" | "default";

export type TwsRecoveryPhase =
  | "idle"
  | "reconnecting"
  | "connected"
  | "failed"
  | "api_connecting"
  | "gateway_disconnected"
  | "client_id_stuck"
  | "restart_required";

export type TwsConnectionState =
  | "idle"
  | "api_connecting"
  | "connected"
  | "gateway_disconnected"
  | "client_id_stuck"
  | "reconnecting"
  | "wedged"
  | "restart_required"
  | "failed"
  | "shutdown";

export type TwsWorkerDiagnostics = {
  queueDepth?: number;
  activeJob?: string | null;
  activeJobAgeMs?: number | null;
  workerWedged?: boolean;
  lastCompletedJob?: string | null;
  lastCompletedAt?: number | null;
  lastWorkerError?: string | null;
  recovery?: {
    phase?: TwsRecoveryPhase;
    startedAt?: number | null;
    updatedAt?: number | null;
    message?: string | null;
    pausedStreams?: boolean;
  };
};

export type TwsStatusProbe = {
  configured: boolean;
  sidecarReachable: boolean;
  gatewayConnected: boolean;
  apiSessionConnected?: boolean;
  gatewaySocketOpen?: boolean;
  connectionState?: TwsConnectionState;
  activeClientId?: number;
  lastIbErrorCode?: number;
  lastIbErrorMessage?: string;
  subscriptionsLost?: boolean;
  restartRequired?: boolean;
  host?: string;
  port?: number;
  clientId?: number;
  readOnly?: boolean;
  message?: string;
  warnings: string[];
  diagnostics?: TwsWorkerDiagnostics;
  /** Sidecar reconnect HTTP accepted but IB work may still be running. */
  reconnectInProgress?: boolean;
  reconnectTimedOut?: boolean;
};

export type TwsContractProbe = {
  symbol: string;
  conid: number;
  exchange?: string;
  companyName?: string;
};

export type TwsContractDetailsProbe = {
  symbol: string;
  conid: number;
  secType?: string | null;
  exchange?: string | null;
  primaryExchange?: string | null;
  companyName?: string | null;
  industry?: string | null;
  category?: string | null;
  subcategory?: string | null;
};

export type TwsHistoryBar = {
  t?: number;
  o?: number;
  h?: number;
  l?: number;
  c?: number;
  v?: number;
};

export type TwsCandlesResponse = {
  symbol: string;
  interval: string;
  candles: TwsHistoryBar[];
  hasMore?: boolean;
};

export type TwsEquityQuoteRow = {
  symbol: string;
  shortName?: string;
  exchange?: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  updatedAt: number;
};

export type TwsQuotesResponse = {
  quotes: TwsEquityQuoteRow[];
  missingSymbols: string[];
};

export type TwsOptionExpirationRow = {
  underlying: string;
  expiration: string;
};

export type TwsOptionContractRow = {
  contractSymbol: string;
  underlying: string;
  type: "call" | "put";
  expiration: string;
  strike: number;
  bid?: number | null;
  ask?: number | null;
  last?: number | null;
  mark?: number | null;
  volume?: number | null;
  openInterest?: number | null;
  impliedVolatility?: number | null;
  delta?: number | null;
  gamma?: number | null;
  theta?: number | null;
  vega?: number | null;
  updatedAt: number;
};

export type TwsOptionsChainResponse = {
  chain: {
    underlying: string;
    expiration: string;
    contracts: TwsOptionContractRow[];
  };
  warnings: string[];
};

function parsePositiveMs(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function timeoutForKind(kind: TwsRequestKind, config: TwsClientConfig): number {
  switch (kind) {
    case "candles":
      return config.candlesTimeoutMs;
    case "quotes":
      return config.quotesTimeoutMs;
    case "options":
      return config.optionsTimeoutMs;
    case "status":
    case "warmup":
    case "default":
      return config.timeoutMs;
  }
}

function readConfig(): TwsClientConfig {
  const enabled = process.env.TWS_ENABLED?.trim() === "true";
  if (!enabled) {
    throw new Error("TWS_ENABLED is not true");
  }
  const baseUrl = process.env.TWS_SIDECAR_URL?.trim() ?? "http://127.0.0.1:8765";
  const timeoutMs = parsePositiveMs(process.env.TWS_SIDECAR_TIMEOUT_MS, 15_000);
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    timeoutMs,
    candlesTimeoutMs: parsePositiveMs(process.env.TWS_CANDLES_TIMEOUT_MS, 3_000),
    quotesTimeoutMs: parsePositiveMs(process.env.TWS_QUOTES_TIMEOUT_MS, 3_000),
    optionsTimeoutMs: parsePositiveMs(process.env.TWS_OPTIONS_TIMEOUT_MS, timeoutMs),
  };
}

export function isTwsConfigured(): boolean {
  return process.env.TWS_ENABLED?.trim() === "true";
}

export function getTwsClientConfig(): TwsClientConfig | null {
  if (!isTwsConfigured()) return null;
  return readConfig();
}

export function getTwsStreamUrl(baseUrl?: string, symbols?: string[]): string {
  const resolved = baseUrl ?? readConfig().baseUrl;
  const params = new URLSearchParams({ symbols: (symbols ?? []).join(",") });
  return `${resolved.replace(/\/$/, "")}/stream/quotes?${params.toString()}`;
}

function parseStatusPayload(status: Record<string, unknown>): TwsStatusProbe {
  const diagnostics = status.diagnostics as TwsWorkerDiagnostics | undefined;
  return {
    configured: true,
    sidecarReachable: true,
    gatewayConnected: Boolean(status.gatewayConnected),
    apiSessionConnected: Boolean(status.apiSessionConnected ?? status.gatewayConnected),
    gatewaySocketOpen: Boolean(status.gatewaySocketOpen ?? status.gatewayConnected),
    connectionState:
      typeof status.connectionState === "string"
        ? (status.connectionState as TwsConnectionState)
        : undefined,
    activeClientId: asFiniteNumber(status.activeClientId) ?? undefined,
    lastIbErrorCode: asFiniteNumber(status.lastIbErrorCode) ?? undefined,
    lastIbErrorMessage:
      typeof status.lastIbErrorMessage === "string" ? status.lastIbErrorMessage : undefined,
    subscriptionsLost: Boolean(status.subscriptionsLost),
    restartRequired: Boolean(status.restartRequired),
    host: typeof status.host === "string" ? status.host : undefined,
    port: asFiniteNumber(status.port) ?? undefined,
    clientId: asFiniteNumber(status.clientId) ?? undefined,
    readOnly: typeof status.readOnly === "boolean" ? status.readOnly : undefined,
    message: typeof status.message === "string" ? status.message : undefined,
    warnings: Array.isArray(status.warnings)
      ? status.warnings.filter((row): row is string => typeof row === "string")
      : [],
    diagnostics,
    reconnectInProgress: Boolean(status.inProgress),
    reconnectTimedOut: Boolean(status.timedOut),
  };
}

function toRequestError(error: unknown, kind: TwsRequestKind): TwsRequestError {
  if (error instanceof TwsRequestError) {
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);
  const category = classifyTwsError(error);
  if (category === "request_timeout" || message.toLowerCase().includes("timeout")) {
    return new TwsRequestError("request_timeout", `${kind} request timed out: ${message}`);
  }
  return new TwsRequestError(category, message);
}

export function createTwsClient(config?: TwsClientConfig) {
  const resolved = config ?? readConfig();

  async function request<T>(
    pathWithQuery: string,
    options: {
      method?: "GET" | "POST";
      body?: unknown;
      kind?: TwsRequestKind;
      allowNullOn404?: boolean;
    } = {},
  ): Promise<T | null> {
    const kind = options.kind ?? "default";
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
        signal: AbortSignal.timeout(timeoutForKind(kind, resolved)),
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
        if (options.allowNullOn404 && res.status === 404) {
          return null;
        }
        const detail =
          typeof json === "object" &&
          json != null &&
          "detail" in json &&
          typeof (json as { detail?: unknown }).detail === "string"
            ? (json as { detail: string }).detail
            : text || `${method} ${path} failed (${res.status})`;
        throw toRequestError(new Error(detail), kind);
      }
      return json as T;
    } catch (error) {
      throw toRequestError(error, kind);
    }
  }

  return {
    getConfig() {
      return resolved;
    },

    async getHealth(): Promise<{ ok: boolean }> {
      const result = await request<{ ok: boolean }>("/health", { kind: "status" });
      return result ?? { ok: false };
    },

    /**
     * Fast control-plane liveness via /health (never queues on IB worker).
     */
    async probeHealth(timeoutMs = 2_000): Promise<TwsHealthProbe | null> {
      const url = `${resolved.baseUrl}/health`;
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) return null;
        const json = (await res.json()) as Record<string, unknown>;
        const caps = json.capabilities as Record<string, unknown> | undefined;
        return {
          ok: json.ok === true,
          timestamp: asFiniteNumber(json.timestamp) ?? undefined,
          startedAt: asFiniteNumber(json.startedAt) ?? undefined,
          version: typeof json.version === "string" ? json.version : undefined,
          host: typeof json.host === "string" ? json.host : undefined,
          port: asFiniteNumber(json.port) ?? undefined,
          clientId: asFiniteNumber(json.clientId) ?? undefined,
          sidecarPort: asFiniteNumber(json.sidecarPort) ?? undefined,
          pid: asFiniteNumber(json.pid) ?? undefined,
          instanceId: typeof json.instanceId === "string" ? json.instanceId : undefined,
          managedBy: typeof json.managedBy === "string" ? json.managedBy : undefined,
          capabilities: caps
            ? {
                controlRecovery: caps.controlRecovery === true,
                controlReconnect: caps.controlReconnect === true,
                streamQuotes: caps.streamQuotes === true,
                brokerage: caps.brokerage === true,
              }
            : undefined,
        };
      } catch {
        return null;
      }
    },

    /**
     * Fast sidecar liveness probe with a short timeout. Returns true when the
     * sidecar answers /health. Used to gate status probes so chart-data
     * requests do not block for the full TWS_SIDECAR_TIMEOUT_MS.
     */
    async probeLiveness(timeoutMs = 2_000): Promise<boolean> {
      const health = await this.probeHealth(timeoutMs);
      return health?.ok === true;
    },

    /**
     * Single short-timeout /status fetch for health probes. Avoids a second
     * full-timeout status call after liveness already proved the sidecar answers.
     */
    async probeStatus(timeoutMs = 2_000): Promise<TwsStatusProbe | null> {
      const url = `${resolved.baseUrl}/status`;
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) return null;
        const status = (await res.json()) as Record<string, unknown>;
        return parseStatusPayload(status);
      } catch {
        return null;
      }
    },

    async getStatus(): Promise<TwsStatusProbe> {
      try {
        const status = await request<Record<string, unknown>>("/status", { kind: "status" });
        if (!status) {
          throw new TwsRequestError("sidecar_unreachable", "TWS sidecar status unavailable");
        }
        return parseStatusPayload(status);
      } catch (error) {
        const twsError = toRequestError(error, "status");
        return {
          configured: true,
          sidecarReachable: twsError.category !== "sidecar_unreachable",
          gatewayConnected: false,
          warnings: [
            twsError.message,
            "Start sidecar with npm run tws:sidecar and IB Gateway paper on TWS_PORT (default 4002).",
          ],
        };
      }
    },

    async resolveContract(symbol: string): Promise<TwsContractProbe | null> {
      const sym = symbol.trim().toUpperCase();
      const params = new URLSearchParams({ symbol: sym });
      try {
        return await request<TwsContractProbe>(`/contract?${params.toString()}`, {
          kind: "warmup",
          allowNullOn404: true,
        });
      } catch {
        return null;
      }
    },

    async getContractDetails(symbol: string): Promise<TwsContractDetailsProbe | null> {
      const sym = symbol.trim().toUpperCase();
      const params = new URLSearchParams({ symbol: sym });
      try {
        return await request<TwsContractDetailsProbe>(
          `/contracts/details?${params.toString()}`,
          {
            kind: "warmup",
            allowNullOn404: true,
          },
        );
      } catch {
        return null;
      }
    },

    async warmup(symbols: string[]): Promise<void> {
      const normalized = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
      if (normalized.length === 0) return;
      try {
        await request<{ warmed?: string[] }>("/warmup", {
          method: "POST",
          body: { symbols: normalized },
          kind: "warmup",
        });
      } catch {
        // Warmup is best-effort and must not block chart loads.
      }
    },

    async getCandles(args: {
      symbol: string;
      interval: string;
      range: string;
      before?: number;
      barCount?: number;
      sessionMode?: 'regular' | 'extended';
    }): Promise<TwsCandlesResponse | null> {
      const params = new URLSearchParams({
        symbol: args.symbol.trim().toUpperCase(),
        interval: args.interval,
        range: args.range,
      });
      if (args.before != null) params.set("before", String(args.before));
      if (args.barCount != null) params.set("barCount", String(args.barCount));
      if (args.sessionMode === "extended") params.set("sessionMode", "extended");
      try {
        return await request<TwsCandlesResponse>(`/candles?${params.toString()}`, {
          kind: "candles",
        });
      } catch (error) {
        throw toRequestError(error, "candles");
      }
    },

    async getQuotesBatch(symbols: string[]): Promise<TwsQuotesResponse> {
      const normalized = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
      if (normalized.length === 0) {
        return { quotes: [], missingSymbols: [] };
      }
      try {
        const result = await request<TwsQuotesResponse>("/quotes", {
          method: "POST",
          body: { symbols: normalized },
          kind: "quotes",
        });
        return result ?? { quotes: [], missingSymbols: normalized };
      } catch (error) {
        throw toRequestError(error, "quotes");
      }
    },

    async getOptionExpirations(underlying: string): Promise<{
      expirations: TwsOptionExpirationRow[];
      warnings: string[];
    }> {
      const params = new URLSearchParams({ underlying: underlying.trim().toUpperCase() });
      const result = await request<{ expirations: TwsOptionExpirationRow[]; warnings?: string[] }>(
        `/options/expirations?${params.toString()}`,
        { kind: "options" },
      );
      if (!result) {
        return { expirations: [], warnings: ["TWS returned no option expirations"] };
      }
      return {
        expirations: result.expirations ?? [],
        warnings: result.warnings ?? [],
      };
    },

    async getOptionsChain(args: {
      underlying: string;
      expiration: string;
      strikeWindow?: unknown;
    }): Promise<TwsOptionsChainResponse> {
      const params = new URLSearchParams({
        underlying: args.underlying.trim().toUpperCase(),
        expiration: args.expiration,
      });
      if (args.strikeWindow != null) {
        params.set("strikeWindow", JSON.stringify(args.strikeWindow));
      }
      const result = await request<TwsOptionsChainResponse>(
        `/options/chain?${params.toString()}`,
        { kind: "options" },
      );
      if (!result) {
        return {
          chain: {
            underlying: args.underlying.trim().toUpperCase(),
            expiration: args.expiration,
            contracts: [],
          },
          warnings: ["TWS returned no options chain"],
        };
      }
      return result;
    },
  };
}

export type TwsClient = ReturnType<typeof createTwsClient>;

export { TwsRequestError };
