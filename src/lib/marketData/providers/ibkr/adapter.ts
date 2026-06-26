import type { Interval, Range } from "@/lib/chart/contracts";
import type { CandleRequest, CandleResponse, EquityQuote } from "../../contracts/equities";
import { asFiniteNumber, asNonEmptyString } from "../../validation/parseRequest";
import {
  createIbkrClient,
  isIbkrConfigured,
  type IbkrAuthStatus,
  type IbkrClient,
  type IbkrHistoryBar,
  type IbkrSnapshotRow,
  type IbkrTickleResponse,
} from "./client";
import { createContractResolver } from "./contractResolver";
import { mapIbkrBar, mapIbkrPeriod } from "./intervals";
import { createIbkrOptionsProvider, type IbkrOptionsProvider } from "./optionsProvider";
import type { OptionExpiration, OptionsChainRequest, OptionsChainResponse } from "../../contracts/options";

export type IbkrStatusProbe = {
  configured: boolean;
  gatewayReachable: boolean;
  authenticated: boolean;
  connected: boolean;
  competing: boolean;
  session?: string;
  message?: string;
  warnings: string[];
};

export type IbkrContractProbe = {
  symbol: string;
  conid: number;
  exchange?: string;
  companyName?: string;
};

export type IbkrBatchQuoteResult = {
  quotes: EquityQuote[];
  /** Symbols that could not be resolved via IBKR. */
  missingSymbols: string[];
};

function parseSnapshotField(row: IbkrSnapshotRow, field: string): number | null {
  const raw = row[field];
  if (raw == null) return null;
  if (typeof raw === "string") {
    const cleaned = raw
      .replace(/^[A-Z]/, "")
      .replace(/^[+]/, "")
      .replace(/M$/i, "")
      .replace(/,/g, "")
      .trim();
    if (cleaned === "" || cleaned === "-") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return asFiniteNumber(raw);
}

function mapSnapshotToQuote(
  contract: { symbol: string; conid: number; exchange?: string; companyName?: string },
  row: IbkrSnapshotRow | undefined,
): EquityQuote {
  const price = row ? parseSnapshotField(row, "31") : null;
  const change = row ? parseSnapshotField(row, "82") : null;
  const changePercent = row ? parseSnapshotField(row, "83") : null;
  const volume =
    row ? (parseSnapshotField(row, "87_raw") ?? parseSnapshotField(row, "87")) : null;

  return {
    symbol: contract.symbol,
    shortName: contract.companyName,
    exchange: contract.exchange,
    price,
    change,
    changePercent,
    volume,
    updatedAt: Date.now(),
  };
}

function mapHistoryBars(bars: IbkrHistoryBar[]): CandleResponse["candles"] {
  return bars
    .map((bar) => {
      const t = asFiniteNumber(bar.t);
      const o = asFiniteNumber(bar.o);
      const h = asFiniteNumber(bar.h);
      const l = asFiniteNumber(bar.l);
      const c = asFiniteNumber(bar.c);
      if (t == null || o == null || h == null || l == null || c == null) return null;
      return {
        t,
        o,
        h,
        l,
        c,
        v: asFiniteNumber(bar.v) ?? undefined,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
}

export function createIbkrProvider(client?: IbkrClient) {
  const ibkr = client ?? (isIbkrConfigured() ? createIbkrClient() : null);
  const contractResolver = ibkr ? createContractResolver(ibkr) : null;
  const options: IbkrOptionsProvider = createIbkrOptionsProvider(
    ibkr ?? undefined,
    contractResolver ?? undefined,
  );

  return {
    isConfigured(): boolean {
      return ibkr != null;
    },

    getClient(): IbkrClient | null {
      return ibkr;
    },

    getContractResolver() {
      return contractResolver;
    },

    async getStatusProbe(): Promise<IbkrStatusProbe> {
      if (!ibkr) {
        return {
          configured: false,
          gatewayReachable: false,
          authenticated: false,
          connected: false,
          competing: false,
          warnings: ["IBKR_ENABLED is not true"],
        };
      }

      const warnings: string[] = [];
      let tickle: IbkrTickleResponse | null = null;
      let status: IbkrAuthStatus = {};
      let gatewayReachable = false;

      try {
        tickle = await ibkr.tickle();
        gatewayReachable = true;
        status = tickle.iserver?.authStatus ?? (await ibkr.getAuthStatus());
      } catch (error) {
        const message = error instanceof Error ? error.message : "IBKR status probe failed";
        warnings.push(message);
        if (message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
          warnings.push(
            "Client Portal Gateway not reachable. Run npm run ibkr:gateway and log in at https://localhost:5001 (not IB Gateway 10.40).",
          );
        }
        return {
          configured: true,
          gatewayReachable: false,
          authenticated: false,
          connected: false,
          competing: false,
          warnings,
        };
      }

      if (!status.authenticated && gatewayReachable) {
        warnings.push(
          "Gateway reachable but not logged in. Open https://localhost:5001, authenticate with 2FA, then rerun probe.",
        );
      }

      if (status.authenticated && !status.connected) {
        try {
          status = await ibkr.ensureSessionForMarketData();
        } catch (error) {
          warnings.push(
            error instanceof Error ? error.message : "IBKR brokerage session init failed",
          );
        }
      }

      return {
        configured: true,
        gatewayReachable,
        authenticated: Boolean(status.authenticated),
        connected: Boolean(status.connected),
        competing: Boolean(status.competing),
        session: tickle?.session,
        message: status.message ?? status.fail,
        warnings,
      };
    },

    async resolveContract(symbol: string): Promise<IbkrContractProbe | null> {
      if (!contractResolver) return null;
      const record = await contractResolver.resolveStockContract(symbol);
      if (!record) return null;
      return {
        symbol: record.symbol,
        conid: record.conid,
        exchange: record.exchange,
        companyName: record.companyName,
      };
    },

    async getQuote(symbol: string): Promise<EquityQuote | null> {
      const batch = await this.getQuotesBatch([symbol]);
      return batch.quotes[0] ?? null;
    },

    /** Batch quotes with partial success — missing symbols listed separately. */
    async getQuotesBatch(symbols: string[]): Promise<IbkrBatchQuoteResult> {
      if (!ibkr || !contractResolver || symbols.length === 0) {
        return { quotes: [], missingSymbols: symbols.map((s) => s.trim().toUpperCase()) };
      }

      await ibkr.ensureSessionForMarketData();

      const normalized = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
      const resolved: Array<{
        symbol: string;
        conid: number;
        exchange?: string;
        companyName?: string;
      }> = [];
      const missingSymbols: string[] = [];

      for (const symbol of normalized) {
        const record = await contractResolver.resolveStockContract(symbol);
        if (!record) {
          missingSymbols.push(symbol);
          continue;
        }
        resolved.push(record);
      }

      if (resolved.length === 0) {
        return { quotes: [], missingSymbols: normalized };
      }

      const snapshotRows = await ibkr.getMarketSnapshots(resolved.map((r) => r.conid));
      const rowByConid = new Map<number, IbkrSnapshotRow>();
      for (const row of snapshotRows) {
        const id = asFiniteNumber(row.conid);
        if (id != null) rowByConid.set(id, row);
      }

      const quotes = resolved.map((contract) =>
        mapSnapshotToQuote(contract, rowByConid.get(contract.conid)),
      );

      return { quotes, missingSymbols };
    },

    /** Legacy shape for MarketDataService — returns null only when zero quotes resolved. */
    async getQuotes(symbols: string[]): Promise<EquityQuote[] | null> {
      const batch = await this.getQuotesBatch(symbols);
      if (batch.quotes.length === 0) return null;
      return batch.quotes;
    },

    async getCandles(request: CandleRequest): Promise<CandleResponse | null> {
      if (!ibkr) return null;
      const sym = request.symbol.trim().toUpperCase();
      const contract = await this.resolveContract(sym);
      if (!contract) return null;

      const range = request.range ?? "1mo";
      const period = mapIbkrPeriod(range);
      const bar = mapIbkrBar(request.interval);

      const history = await ibkr.getHistory(contract.conid, period, bar, true);
      if (history.error) {
        throw new Error(history.error);
      }
      const candles = mapHistoryBars(history.data ?? []);
      return {
        symbol: sym,
        interval: request.interval,
        candles,
        hasMore: candles.length > 0 ? undefined : false,
      };
    },

    async getCandlesForRange(
      symbol: string,
      interval: Interval,
      range: Range,
    ): Promise<CandleResponse | null> {
      return this.getCandles({ symbol, interval, range });
    },

    async getOptionExpirations(underlying: string): Promise<OptionExpiration[] | null> {
      if (!ibkr) return null;
      const result = await options.getExpirations(underlying);
      if (result.expirations.length === 0) return null;
      return result.expirations;
    },

    async getOptionsChain(
      request: OptionsChainRequest,
    ): Promise<OptionsChainResponse | null> {
      if (!ibkr) return null;
      const result = await options.getChain(request);
      if (result.chain.contracts.length === 0) return null;
      return result.chain;
    },

    async getOptionExpirationsWithWarnings(underlying: string) {
      if (!ibkr) return null;
      return options.getExpirations(underlying);
    },

    async getOptionsChainWithWarnings(request: OptionsChainRequest) {
      if (!ibkr) return null;
      return options.getChain(request);
    },
  };
}

export type IbkrProvider = ReturnType<typeof createIbkrProvider>;
