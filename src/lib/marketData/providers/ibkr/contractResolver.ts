import { asNonEmptyString } from "../../validation/parseRequest";
import type { ContractCache } from "./contractCache";
import { getSharedContractCache } from "./contractCache";
import type { IbkrClient, IbkrSecdefSearchRow } from "./client";
import type { StockContractRecord } from "./contractCache";
import { extractOptionMonthsFromSecdef, findOptionsSecdefRow } from "./secdefUtils";

const US_PRIMARY_EXCHANGES = new Set(["NASDAQ", "NYSE", "ARCA", "AMEX", "BATS", "ISLAND"]);

function parseConid(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

type TrsrvStockContract = { conid?: number; exchange?: string; isUS?: boolean };
type TrsrvStockEntry = { name?: string; contracts?: TrsrvStockContract[] };

function pickTrsrvConid(entries: TrsrvStockEntry[]): number | null {
  for (const entry of entries) {
    const contracts = entry.contracts ?? [];
    const nasdaqUs = contracts.find((c) => c.isUS && c.exchange === "NASDAQ");
    if (nasdaqUs?.conid != null) return nasdaqUs.conid;
    const nyseUs = contracts.find((c) => c.isUS && c.exchange === "NYSE");
    if (nyseUs?.conid != null) return nyseUs.conid;
    const us = contracts.find((c) => c.isUS && c.conid != null && c.conid > 0);
    if (us?.conid != null) return us.conid;
  }
  return null;
}

function pickSecdefStockRow(rows: IbkrSecdefSearchRow[]): IbkrSecdefSearchRow | null {
  for (const row of rows) {
    const conid = parseConid(row.conid);
    if (conid == null) continue;
    const desc = row.description?.toUpperCase() ?? "";
    if (US_PRIMARY_EXCHANGES.has(desc)) return row;
    if (desc.includes("NASDAQ") || desc.includes("NYSE")) return row;
  }
  for (const row of rows) {
    if (parseConid(row.conid) != null) return row;
  }
  return null;
}

export type ResolvedStockContract = StockContractRecord;

export type ResolvedOptionsUnderlying = {
  symbol: string;
  stockConid: number;
  optionsConid: number;
  months: string[];
  exchange?: string;
  companyName?: string;
};

export function createContractResolver(
  ibkr: IbkrClient,
  cache: ContractCache = getSharedContractCache(),
) {
  async function loadSecdefRows(symbol: string): Promise<IbkrSecdefSearchRow[]> {
    const cached = cache.getSecdef(symbol);
    if (cached) return cached;
    const rows = await ibkr.searchSecdef(symbol);
    cache.setSecdef(symbol, rows);
    return rows;
  }

  async function resolveStockContract(symbol: string): Promise<ResolvedStockContract | null> {
    const sym = symbol.trim().toUpperCase();
    const cached = cache.getStock(sym);
    if (cached) return cached;

    await ibkr.ensureSessionForMarketData();

    let conid: number | null = null;
    let exchange: string | undefined;
    let companyName: string | undefined;

    const secdefRows = await loadSecdefRows(sym);
    const secdefRow = pickSecdefStockRow(secdefRows);
    if (secdefRow) {
      conid = parseConid(secdefRow.conid);
      exchange = secdefRow.description ?? undefined;
      companyName = secdefRow.description ?? undefined;
    }

    if (conid == null) {
      conid = await ibkr.lookupStockConid(sym);
    }

    if (conid == null) return null;

    try {
      const info = await ibkr.getContractInfo(conid);
      const infoExchange =
        asNonEmptyString(info.exchange) ??
        asNonEmptyString(info.listingExchange) ??
        asNonEmptyString(info.primaryExchange);
      const infoCurrency = asNonEmptyString(info.currency);
      const infoName =
        asNonEmptyString(info.companyName) ?? asNonEmptyString(info.description);

      if (infoExchange) exchange = infoExchange;
      if (infoName) companyName = infoName;

      if (
        infoCurrency &&
        !["USD", "US"].includes(infoCurrency.toUpperCase()) &&
        infoExchange &&
        ["VALUE", "SMART"].includes(infoExchange.toUpperCase())
      ) {
        const usRow = secdefRows.find((r) => {
          const d = r.description?.toUpperCase() ?? "";
          return US_PRIMARY_EXCHANGES.has(d) || d.includes("NASDAQ") || d.includes("NYSE");
        });
        const usConid = usRow ? parseConid(usRow.conid) : null;
        if (usConid != null) {
          conid = usConid;
          exchange = usRow?.description ?? exchange;
        }
      }
    } catch {
      // conid alone is sufficient for quotes.
    }

    const record: ResolvedStockContract = {
      symbol: sym,
      conid,
      exchange,
      companyName,
    };
    cache.setStock(record);
    return record;
  }

  async function resolveOptionsUnderlying(
    symbol: string,
  ): Promise<ResolvedOptionsUnderlying | null> {
    const sym = symbol.trim().toUpperCase();
    const cachedMonths = cache.getOptionMonths(sym);
    if (cachedMonths) {
      const stock = cache.getStock(sym);
      return {
        symbol: sym,
        stockConid: stock?.conid ?? cachedMonths.optionsConid,
        optionsConid: cachedMonths.optionsConid,
        months: cachedMonths.months,
        exchange: stock?.exchange,
        companyName: stock?.companyName,
      };
    }

    await ibkr.ensureSessionForMarketData();
    const stock = await resolveStockContract(sym);
    const secdefRows = await loadSecdefRows(sym);
    const optRow = findOptionsSecdefRow(secdefRows);
    const optionsConid = optRow ? parseConid(optRow.conid) : null;
    const months = extractOptionMonthsFromSecdef(secdefRows);

    if (optionsConid == null || months.length === 0) {
      if (stock == null) return null;
      return {
        symbol: sym,
        stockConid: stock.conid,
        optionsConid: stock.conid,
        months: [],
        exchange: stock.exchange,
        companyName: stock.companyName,
      };
    }

    cache.setOptionMonths({
      symbol: sym,
      optionsConid,
      months,
    });

    return {
      symbol: sym,
      stockConid: stock?.conid ?? optionsConid,
      optionsConid,
      months,
      exchange: stock?.exchange,
      companyName: stock?.companyName,
    };
  }

  async function getCachedOptionStrikes(
    conid: number,
    month: string,
  ): Promise<{ call?: number[]; put?: number[] }> {
    const cached = cache.getStrikes(conid, month);
    if (cached) return cached;
    const strikes = await ibkr.getOptionStrikes(conid, month);
    cache.setStrikes(conid, month, strikes);
    return strikes;
  }

  async function getCachedOptionContractInfo(
    conid: number,
    month: string,
    strike: number,
    right: "C" | "P",
  ) {
    const cached = cache.getOptionInfo(conid, month, strike, right);
    if (cached) return cached;
    const rows = await ibkr.getOptionContractInfo(conid, month, strike, right);
    cache.setOptionInfo(conid, month, strike, right, rows);
    return rows;
  }

  return {
    resolveStockContract,
    resolveOptionsUnderlying,
    getCachedOptionStrikes,
    getCachedOptionContractInfo,
    loadSecdefRows,
  };
}

export type IbkrContractResolver = ReturnType<typeof createContractResolver>;
