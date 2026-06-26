import { Agent, fetch as undiciFetch } from "undici";
import { assertIbkrPathAllowed, normalizeIbkrPath } from "./allowlist";
import { extractOptionMonthsFromSecdef } from "./secdefUtils";
import { createRequestThrottle } from "./requestThrottle";
import { asFiniteNumber, asNonEmptyString } from "../../validation/parseRequest";

export function parseConid(value: unknown): number | null {
  if (typeof value === "number") return asFiniteNumber(value);
  if (typeof value === "string" && value.trim() !== "") {
    return asFiniteNumber(Number(value));
  }
  return null;
}

type TrsrvStockContract = { conid?: number; exchange?: string; isUS?: boolean };
type TrsrvStockEntry = { name?: string; contracts?: TrsrvStockContract[] };

function pickStockConid(entries: TrsrvStockEntry[]): number | null {
  for (const entry of entries) {
    const contracts = entry.contracts ?? [];
    const nasdaqUs = contracts.find((c) => c.isUS && c.exchange === "NASDAQ");
    if (nasdaqUs?.conid != null) return nasdaqUs.conid;
    const us = contracts.find((c) => c.isUS && c.conid != null && c.conid > 0);
    if (us?.conid != null) return us.conid;
    const first = contracts.find((c) => c.conid != null && c.conid > 0);
    if (first?.conid != null) return first.conid;
  }
  return null;
}

export type IbkrAuthStatus = {
  authenticated?: boolean;
  connected?: boolean;
  competing?: boolean;
  message?: string;
  fail?: string;
  MAC?: string;
};

export type IbkrTickleResponse = {
  session?: string;
  ssoExpires?: number;
  userId?: number;
  iserver?: { authStatus?: IbkrAuthStatus };
};

export type IbkrHistoryBar = {
  o?: number;
  c?: number;
  h?: number;
  l?: number;
  v?: number;
  t?: number;
};

export type IbkrHistoryResponse = {
  symbol?: string;
  data?: IbkrHistoryBar[];
  error?: string;
  message?: string;
};

export type IbkrSnapshotRow = Record<string, string | number | undefined> & {
  conid?: number;
};

export type IbkrSecdefSection = {
  secType?: string;
  months?: string;
  exchange?: string;
};

export type IbkrSecdefSearchRow = {
  conid?: number | string;
  symbol?: string;
  description?: string;
  sections?: IbkrSecdefSection[];
};

export type IbkrOptionStrikesResponse = {
  call?: number[];
  put?: number[];
};

export type IbkrOptionInfoRow = {
  conid?: number | string;
  symbol?: string;
  strike?: number | string;
  maturityDate?: string;
  right?: string;
  desc1?: string;
  desc2?: string;
  currency?: string;
  exchange?: string;
};

export type IbkrClientConfig = {
  baseUrl: string;
  sslVerify: boolean;
  readOnly: boolean;
  competeSession?: boolean;
};

const EQUITY_SNAPSHOT_FIELDS = "31,82,83,87,87_raw,6509,7289";
const OPTION_SNAPSHOT_FIELDS =
  "31,84,86,87,7638,7633,7308,7309,7310,7311,7289";
const SNAPSHOT_BATCH_MAX = 100;
const SNAPSHOT_POLL_ATTEMPTS = 3;
const SNAPSHOT_POLL_INTERVAL_MS = 150;

let insecureDispatcher: Agent | undefined;

function getDispatcher(sslVerify: boolean): Agent | undefined {
  if (sslVerify) return undefined;
  if (!insecureDispatcher) {
    insecureDispatcher = new Agent({ connect: { rejectUnauthorized: false } });
  }
  return insecureDispatcher;
}

function readConfig(): IbkrClientConfig & { competeSession: boolean } {
  const enabled = process.env.IBKR_ENABLED?.trim() === "true";
  if (!enabled) {
    throw new Error("IBKR_ENABLED is not true");
  }
  const baseUrl = process.env.IBKR_BASE_URL?.trim() ?? "https://localhost:5000/v1/api";
  const sslVerify = process.env.IBKR_SSL_VERIFY?.trim() === "true";
  const readOnly = process.env.IBKR_READ_ONLY?.trim() !== "false";
  const competeSession = process.env.IBKR_COMPETE_SESSION?.trim() === "true";
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    sslVerify,
    readOnly,
    competeSession,
  };
}

export function isIbkrConfigured(): boolean {
  return process.env.IBKR_ENABLED?.trim() === "true";
}

export function getIbkrClientConfig(): IbkrClientConfig | null {
  if (!isIbkrConfigured()) return null;
  return readConfig();
}

export function getIbkrWebSocketUrl(baseUrl?: string): string {
  const resolved = baseUrl ?? readConfig().baseUrl;
  const url = new URL(resolved);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = url.pathname.replace(/\/$/, "") + "/ws";
  url.search = "";
  return url.toString();
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function snapshotRowHasData(row: IbkrSnapshotRow): boolean {
  const last = row["31"];
  const availability = row["6509"];
  if (last != null && String(last).trim() !== "" && String(last) !== "-") return true;
  if (availability != null && String(availability).trim() !== "") return true;
  return false;
}

function countRowsWithData(rows: IbkrSnapshotRow[], expected: number): number {
  return rows.filter(snapshotRowHasData).length;
}

export function createIbkrClient(config?: IbkrClientConfig) {
  const resolved = config ?? readConfig();
  const throttle = createRequestThrottle();
  let accountsPreflightDone = false;
  let cachedSessionId: string | undefined;

  async function request<T>(
    pathWithQuery: string,
    options: {
      method?: "GET" | "POST";
      body?: unknown;
      /** Gateway returns 401 before browser login; still means the service is up. */
      allowUnauthorized?: boolean;
    } = {},
  ): Promise<T> {
    return throttle.schedule(async () => {
      if (resolved.readOnly) {
        assertIbkrPathAllowed(pathWithQuery);
      }
      const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
      const url = `${resolved.baseUrl}${path}`;
      const method = options.method ?? "GET";

      const dispatcher = getDispatcher(resolved.sslVerify);
      const res = await undiciFetch(url, {
        method,
        headers:
          options.body != null
            ? { "Content-Type": "application/json", Accept: "application/json" }
            : { Accept: "application/json" },
        body: options.body != null ? JSON.stringify(options.body) : undefined,
        dispatcher,
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
        if (options.allowUnauthorized && res.status === 401) {
          return (json ?? {}) as T;
        }
        const detail =
          typeof json === "object" && json != null && "error" in json
            ? String((json as { error?: string }).error)
            : text.slice(0, 200);
        throw new Error(
          `IBKR request failed (${res.status}) ${normalizeIbkrPath(path)}: ${detail || "unauthorized"}`,
        );
      }

      return json as T;
    });
  }

  async function fetchSnapshotsOnce(
    conids: number[],
    fields: string,
  ): Promise<IbkrSnapshotRow[]> {
    if (conids.length === 0) return [];
    const path = `/iserver/marketdata/snapshot?conids=${conids.join(",")}&fields=${fields}`;
    const rows = await request<IbkrSnapshotRow[]>(path);
    return Array.isArray(rows) ? rows : [];
  }

  async function pollMarketSnapshots(
    conids: number[],
    fields: string,
  ): Promise<IbkrSnapshotRow[]> {
    if (conids.length === 0) return [];
    await fetchSnapshotsOnce(conids, fields);
    let rows: IbkrSnapshotRow[] = [];
    for (let attempt = 0; attempt < SNAPSHOT_POLL_ATTEMPTS; attempt += 1) {
      if (attempt > 0) {
        await sleep(SNAPSHOT_POLL_INTERVAL_MS);
      }
      rows = await fetchSnapshotsOnce(conids, fields);
      const withData = countRowsWithData(rows, conids.length);
      if (withData >= Math.ceil(conids.length * 0.5) || attempt === SNAPSHOT_POLL_ATTEMPTS - 1) {
        return rows;
      }
    }
    return rows;
  }

  async function getMarketSnapshotsBatched(
    conids: number[],
    fields: string,
  ): Promise<IbkrSnapshotRow[]> {
    const unique = [...new Set(conids.filter((id) => Number.isFinite(id) && id > 0))];
    const allRows: IbkrSnapshotRow[] = [];
    for (let i = 0; i < unique.length; i += SNAPSHOT_BATCH_MAX) {
      const batch = unique.slice(i, i + SNAPSHOT_BATCH_MAX);
      const rows = await pollMarketSnapshots(batch, fields);
      allRows.push(...rows);
    }
    return allRows;
  }

  return {
    config: resolved,

    async getAuthStatus(): Promise<IbkrAuthStatus> {
      return request<IbkrAuthStatus>("/iserver/auth/status", { allowUnauthorized: true });
    },

    async tickle(): Promise<IbkrTickleResponse> {
      const tickle = await request<IbkrTickleResponse>("/tickle", { allowUnauthorized: true });
      if (tickle.session) {
        cachedSessionId = tickle.session;
      }
      return tickle;
    },

    getSessionId(): string | undefined {
      return cachedSessionId;
    },

    /** IBKR docs: call /iserver/accounts once before market data snapshots. */
    async ensureAccountsPreflight(): Promise<void> {
      if (accountsPreflightDone) return;
      try {
        await request<unknown>("/iserver/accounts", { allowUnauthorized: true });
      } catch {
        // Non-fatal when gateway is not fully authenticated.
      }
      accountsPreflightDone = true;
    },

    /** Initialize brokerage session for market data (no orders). publish:true is required by IBKR. */
    async initBrokerageSession(): Promise<IbkrAuthStatus> {
      return request<IbkrAuthStatus>("/iserver/auth/ssodh/init", {
        method: "POST",
        body: { publish: true, compete: resolved.competeSession ?? false },
      });
    },

    async searchStockConid(symbol: string): Promise<number | null> {
      const sym = symbol.trim().toUpperCase();
      const payload = await request<Array<Record<string, unknown>>>(
        `/iserver/secdef/search?symbol=${encodeURIComponent(sym)}&name=true&secType=STK`,
      );
      if (!Array.isArray(payload)) return null;
      for (const row of payload) {
        const conid = parseConid(row.conid);
        if (conid != null && conid > 0) return conid;
      }
      return null;
    },

    async lookupStockConid(symbol: string): Promise<number | null> {
      const sym = symbol.trim().toUpperCase();
      try {
        const payload = await request<Record<string, unknown>>(
          `/trsrv/stocks?symbols=${encodeURIComponent(sym)}`,
        );
        const entries = payload[sym];
        if (Array.isArray(entries)) {
          const conid = pickStockConid(entries as TrsrvStockEntry[]);
          if (conid != null) return conid;
        }
      } catch {
        // Fall back to secdef search.
      }
      return this.searchStockConid(sym);
    },

    async getContractInfo(conid: number): Promise<Record<string, unknown>> {
      return request<Record<string, unknown>>(`/iserver/contract/${conid}/info`);
    },

    async getMarketSnapshots(conids: number[]): Promise<IbkrSnapshotRow[]> {
      await this.ensureAccountsPreflight();
      return getMarketSnapshotsBatched(conids, EQUITY_SNAPSHOT_FIELDS);
    },

    /**
     * Snapshot requires a pre-flight request; subsequent calls return data.
     * Fields: 31 last, 82 change, 83 change%, 87 volume.
     */
    async getMarketSnapshot(conid: number): Promise<IbkrSnapshotRow[]> {
      return this.getMarketSnapshots([conid]);
    },

    /** Option snapshots: bid/ask, volume, OI, IV, greeks when available. */
    async getOptionMarketSnapshots(conids: number[]): Promise<IbkrSnapshotRow[]> {
      if (conids.length === 0) return [];
      await this.ensureAccountsPreflight();
      return getMarketSnapshotsBatched(conids, OPTION_SNAPSHOT_FIELDS);
    },

    /** Required preflight before secdef/strikes and secdef/info for derivatives. */
    async searchSecdef(symbol: string): Promise<IbkrSecdefSearchRow[]> {
      const sym = symbol.trim().toUpperCase();
      const payload = await request<IbkrSecdefSearchRow[]>(
        `/iserver/secdef/search?symbol=${encodeURIComponent(sym)}`,
      );
      return Array.isArray(payload) ? payload : [];
    },

    extractOptionMonths(rows: IbkrSecdefSearchRow[], _stockConid?: number): string[] {
      return extractOptionMonthsFromSecdef(rows);
    },

    async getOptionStrikes(
      conid: number,
      month: string,
    ): Promise<IbkrOptionStrikesResponse> {
      const params = new URLSearchParams({
        conid: String(conid),
        sectype: "OPT",
        month,
      });
      const payload = await request<IbkrOptionStrikesResponse>(
        `/iserver/secdef/strikes?${params.toString()}`,
      );
      return payload ?? {};
    },

    async getOptionContractInfo(
      conid: number,
      month: string,
      strike: number,
      right: "C" | "P",
    ): Promise<IbkrOptionInfoRow[]> {
      const params = new URLSearchParams({
        conid: String(conid),
        sectype: "OPT",
        month,
        strike: String(strike),
        right,
      });
      const payload = await request<IbkrOptionInfoRow[]>(
        `/iserver/secdef/info?${params.toString()}`,
      );
      return Array.isArray(payload) ? payload : [];
    },

    async getHistory(
      conid: number,
      period: string,
      bar: string,
      outsideRth = true,
    ): Promise<IbkrHistoryResponse> {
      const params = new URLSearchParams({
        conid: String(conid),
        period,
        bar,
        outsideRth: String(outsideRth),
      });
      return request<IbkrHistoryResponse>(`/iserver/marketdata/history?${params.toString()}`);
    },

    async ensureSessionForMarketData(): Promise<IbkrAuthStatus> {
      let status = await this.getAuthStatus();
      if (!status.authenticated) {
        return status;
      }
      if (!status.connected) {
        try {
          status = await this.initBrokerageSession();
          await sleep(500);
          if (!status.connected) {
            status = await this.getAuthStatus();
          }
        } catch {
          // Return last known status if init fails (read-only probe).
        }
      }
      if (status.authenticated) {
        await this.ensureAccountsPreflight();
      }
      return status;
    },
  };
}

export type IbkrClient = ReturnType<typeof createIbkrClient>;
