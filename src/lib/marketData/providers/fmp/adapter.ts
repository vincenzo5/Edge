import type { CorporateEvent } from "../../contracts/events";
import type {
  FmpAnalystEstimate,
  FmpCompanyProfile,
  FmpExecutive,
  FmpFinancialsBundle,
  FmpEconomicCalendarEvent,
  FmpMarketMover,
  FmpMarketMoverKind,
  FmpScreenerRow,
  FmpSecFiling,
  FmpStatementPeriod,
} from "../../contracts/fmp";
import type { NewsItem } from "../../contracts/news";
import type { ScreenQuery } from "../../schemas/request";
import { asFiniteNumber, asNonEmptyString } from "../../validation/parseRequest";
import { fmpApiKey, fmpGet, defaultFmpSecFilingDateWindow } from "./client";
import {
  fmpPeriodParam,
  mapFmpAnalystEstimate,
  mapFmpBalanceSheet,
  mapFmpCashFlowStatement,
  mapFmpCompanyProfile,
  mapFmpEnterpriseValue,
  mapFmpExecutive,
  mapFmpFinancialRatios,
  mapFmpIncomeStatement,
  mapFmpKeyMetrics,
  mapFmpMarketMover,
  mapFmpScreenerRow,
  mapFmpSecFiling,
  fmpRowMatchesSymbol,
  mapFmpSplitEvent,
  mapFmpEconomicCalendarEvent,
  mapRows,
} from "./mappers";
import { screenQueryToFmpParams } from "./screenerParams";

const MOVER_PATHS: Record<FmpMarketMoverKind, string> = {
  gainers: "/biggest-gainers",
  losers: "/biggest-losers",
  actives: "/most-actives",
};

export function createFmpProvider() {
  return {
    isConfigured(): boolean {
      return fmpApiKey() != null;
    },

    async getCompanyProfile(symbol: string): Promise<{
      profile: FmpCompanyProfile | null;
      warnings: string[];
    }> {
      if (!this.isConfigured()) {
        return { profile: null, warnings: ["FMP_API_KEY is not configured"] };
      }
      const sym = symbol.trim().toUpperCase();
      const result = await fmpGet<Array<Record<string, unknown>>>(
        "/profile",
        { symbol: sym },
        { allowPlanErrors: true },
      );
      const row = Array.isArray(result.data) ? result.data[0] : null;
      const profile =
        row && typeof row === "object"
          ? mapFmpCompanyProfile(sym, row as Record<string, unknown>)
          : null;
      return { profile, warnings: result.warnings };
    },

    async getAnalystEstimates(args: {
      symbol: string;
      period?: FmpStatementPeriod;
      limit?: number;
    }): Promise<{ estimates: FmpAnalystEstimate[]; warnings: string[] }> {
      if (!this.isConfigured()) {
        return { estimates: [], warnings: ["FMP_API_KEY is not configured"] };
      }
      const sym = args.symbol.trim().toUpperCase();
      const period = args.period ?? "annual";
      const limit = String(args.limit ?? 4);
      const result = await fmpGet<Array<Record<string, unknown>>>(
        "/analyst-estimates",
        { symbol: sym, period, limit },
        { allowPlanErrors: true },
      );
      return {
        estimates: mapRows(result.data, (row) => mapFmpAnalystEstimate(sym, row)),
        warnings: result.warnings,
      };
    },

    async getFinancialsBundle(args: {
      symbol: string;
      period?: FmpStatementPeriod;
      limit?: number;
    }): Promise<{ bundle: FmpFinancialsBundle; warnings: string[] }> {
      if (!this.isConfigured()) {
        return {
          bundle: emptyFinancialsBundle(args.symbol, args.period ?? "annual"),
          warnings: ["FMP_API_KEY is not configured"],
        };
      }
      const sym = args.symbol.trim().toUpperCase();
      const period = args.period ?? "annual";
      const limit = String(args.limit ?? 4);
      const periodParam = fmpPeriodParam(period);
      const warnings: string[] = [];

      const [
        incomeResult,
        balanceResult,
        cashFlowResult,
        metricsResult,
        ratiosResult,
        evResult,
      ] = await Promise.all([
        fmpGet<Array<Record<string, unknown>>>(
          "/income-statement",
          { symbol: sym, period: periodParam, limit },
          { allowPlanErrors: true },
        ),
        fmpGet<Array<Record<string, unknown>>>(
          "/balance-sheet-statement",
          { symbol: sym, period: periodParam, limit },
          { allowPlanErrors: true },
        ),
        fmpGet<Array<Record<string, unknown>>>(
          "/cash-flow-statement",
          { symbol: sym, period: periodParam, limit },
          { allowPlanErrors: true },
        ),
        fmpGet<Array<Record<string, unknown>>>(
          "/key-metrics",
          { symbol: sym, period: periodParam, limit },
          { allowPlanErrors: true },
        ),
        fmpGet<Array<Record<string, unknown>>>(
          "/ratios",
          { symbol: sym, period: periodParam, limit },
          { allowPlanErrors: true },
        ),
        fmpGet<Array<Record<string, unknown>>>(
          "/enterprise-values",
          { symbol: sym, period: periodParam, limit },
          { allowPlanErrors: true },
        ),
      ]);

      for (const result of [
        incomeResult,
        balanceResult,
        cashFlowResult,
        metricsResult,
        ratiosResult,
        evResult,
      ]) {
        warnings.push(...result.warnings);
      }

      return {
        bundle: {
          symbol: sym,
          period,
          incomeStatements: mapRows(incomeResult.data, (row) =>
            mapFmpIncomeStatement(sym, row),
          ),
          balanceSheets: mapRows(balanceResult.data, (row) => mapFmpBalanceSheet(sym, row)),
          cashFlowStatements: mapRows(cashFlowResult.data, (row) =>
            mapFmpCashFlowStatement(sym, row),
          ),
          keyMetrics: mapRows(metricsResult.data, (row) => mapFmpKeyMetrics(sym, row)),
          ratios: mapRows(ratiosResult.data, (row) => mapFmpFinancialRatios(sym, row)),
          enterpriseValues: mapRows(evResult.data, (row) => mapFmpEnterpriseValue(sym, row)),
        },
        warnings,
      };
    },

    async getExecutives(symbol: string): Promise<{
      executives: FmpExecutive[];
      warnings: string[];
    }> {
      if (!this.isConfigured()) {
        return { executives: [], warnings: ["FMP_API_KEY is not configured"] };
      }
      const sym = symbol.trim().toUpperCase();
      const result = await fmpGet<Array<Record<string, unknown>>>(
        "/key-executives",
        { symbol: sym },
        { allowPlanErrors: true },
      );
      return {
        executives: mapRows(result.data, mapFmpExecutive),
        warnings: result.warnings,
      };
    },

    async getSecFilings(args: {
      symbol: string;
      from?: string;
      to?: string;
      limit?: number;
    }): Promise<{ filings: FmpSecFiling[]; warnings: string[] }> {
      if (!this.isConfigured()) {
        return { filings: [], warnings: ["FMP_API_KEY is not configured"] };
      }
      const sym = args.symbol.trim().toUpperCase();
      const { from, to } = defaultFmpSecFilingDateWindow(args);
      const params: Record<string, string> = {
        symbol: sym,
        page: "0",
        limit: String(args.limit ?? 10),
        from,
        to,
      };

      const result = await fmpGet<Array<Record<string, unknown>>>(
        "/sec-filings-search/symbol",
        params,
        { allowPlanErrors: true },
      );
      return {
        filings: mapRows(result.data, (row) => mapFmpSecFiling(sym, row)),
        warnings: result.warnings,
      };
    },

    async getMarketMovers(args: {
      kind?: FmpMarketMoverKind;
      limit?: number;
    }): Promise<{ movers: FmpMarketMover[]; warnings: string[] }> {
      if (!this.isConfigured()) {
        return { movers: [], warnings: ["FMP_API_KEY is not configured"] };
      }
      const kind = args.kind ?? "gainers";
      const result = await fmpGet<Array<Record<string, unknown>>>(
        MOVER_PATHS[kind],
        {},
        { allowPlanErrors: true },
      );
      const movers = mapRows(result.data, mapFmpMarketMover);
      const limit = args.limit ?? 10;
      return {
        movers: movers.slice(0, limit),
        warnings: result.warnings,
      };
    },

    async runStockScreener(query: ScreenQuery): Promise<{
      rows: FmpScreenerRow[];
      warnings: string[];
    }> {
      if (!this.isConfigured()) {
        return { rows: [], warnings: ["FMP_API_KEY is not configured"] };
      }
      const params = screenQueryToFmpParams(query);
      const result = await fmpGet<Array<Record<string, unknown>>>(
        "/company-screener",
        params,
        { allowPlanErrors: true },
      );
      return {
        rows: mapRows(result.data, mapFmpScreenerRow),
        warnings: result.warnings,
      };
    },

    async getCorporateEvents(args: {
      symbol?: string;
      from?: string;
      to?: string;
    }): Promise<{ events: CorporateEvent[]; warnings: string[] }> {
      if (!this.isConfigured()) {
        return { events: [], warnings: ["FMP_API_KEY is not configured"] };
      }
      const symbol = args.symbol?.toUpperCase();
      if (!symbol) return { events: [], warnings: [] };

      const calendarParams: Record<string, string> = { symbol };
      if (args.from) calendarParams.from = args.from;
      if (args.to) calendarParams.to = args.to;

      const [earningsResult, dividendsResult, splitsResult] = await Promise.all([
        fmpGet<Array<Record<string, unknown>>>(
          "/earnings-calendar",
          calendarParams,
          { allowPlanErrors: true },
        ),
        fmpGet<Array<Record<string, unknown>>>(
          "/dividends-calendar",
          calendarParams,
          { allowPlanErrors: true },
        ),
        fmpGet<Array<Record<string, unknown>>>(
          "/splits-calendar",
          calendarParams,
          { allowPlanErrors: true },
        ),
      ]);

      const warnings = [
        ...earningsResult.warnings,
        ...dividendsResult.warnings,
        ...splitsResult.warnings,
      ];
      const events: CorporateEvent[] = [];

      for (const row of Array.isArray(earningsResult.data) ? earningsResult.data : []) {
        const record = row as Record<string, unknown>;
        if (!fmpRowMatchesSymbol(record, symbol)) continue;
        const date = asNonEmptyString(record.date);
        if (!date) continue;
        events.push({
          id: `fmp-earnings-${symbol}-${date}`,
          type: "earnings",
          symbol,
          title: `${symbol} earnings`,
          scheduledAt: date,
          source: "fmp",
          details: {
            eps: asFiniteNumber(record.eps),
            epsEstimated: asFiniteNumber(record.epsEstimated),
            revenue: asFiniteNumber(record.revenue),
            revenueEstimated: asFiniteNumber(record.revenueEstimated),
          },
        });
      }

      for (const row of Array.isArray(dividendsResult.data) ? dividendsResult.data : []) {
        const record = row as Record<string, unknown>;
        if (!fmpRowMatchesSymbol(record, symbol)) continue;
        const date = asNonEmptyString(record.date);
        if (!date) continue;
        events.push({
          id: `fmp-dividend-${symbol}-${date}`,
          type: "dividend",
          symbol,
          title: `${symbol} dividend`,
          scheduledAt: date,
          source: "fmp",
          details: {
            dividend: asFiniteNumber(record.dividend),
            adjDividend: asFiniteNumber(record.adjDividend),
          },
        });
      }

      for (const row of Array.isArray(splitsResult.data) ? splitsResult.data : []) {
        const split = mapFmpSplitEvent(symbol, row as Record<string, unknown>);
        if (split) events.push(split);
      }

      return { events, warnings };
    },

    async getEconomicCalendar(args: {
      from: string;
      to: string;
    }): Promise<{ events: FmpEconomicCalendarEvent[]; warnings: string[] }> {
      if (!this.isConfigured()) {
        return { events: [], warnings: ["FMP_API_KEY is not configured"] };
      }
      const result = await fmpGet<Array<Record<string, unknown>>>(
        "/economic-calendar",
        { from: args.from, to: args.to },
        { allowPlanErrors: true },
      );
      return {
        events: mapRows(result.data, mapFmpEconomicCalendarEvent),
        warnings: result.warnings,
      };
    },

    async getNews(args: { symbol?: string; limit?: number }): Promise<{
      news: NewsItem[];
      warnings: string[];
    }> {
      if (!this.isConfigured()) {
        return { news: [], warnings: ["FMP_API_KEY is not configured"] };
      }
      const limit = String(args.limit ?? 20);
      const result = args.symbol
        ? await fmpGet<Array<Record<string, unknown>>>(
            "/news/stock",
            { symbols: args.symbol.toUpperCase(), limit },
            { allowPlanErrors: true },
          )
        : await fmpGet<Array<Record<string, unknown>>>(
            "/news/general-latest",
            { page: "0", limit },
            { allowPlanErrors: true },
          );

      const news = (Array.isArray(result.data) ? result.data : [])
        .map((row, index) => {
          const headline = asNonEmptyString(row.title ?? row.headline);
          const publishedAt = asNonEmptyString(row.publishedDate ?? row.date);
          if (!headline || !publishedAt) return null;
          const symbolsRaw = row.symbol ?? row.symbols;
          const symbols =
            typeof symbolsRaw === "string"
              ? [symbolsRaw.toUpperCase()]
              : Array.isArray(symbolsRaw)
                ? symbolsRaw
                    .map((s) => asNonEmptyString(s)?.toUpperCase())
                    .filter((s): s is string => Boolean(s))
                : args.symbol
                  ? [args.symbol.toUpperCase()]
                  : [];
          const item: NewsItem = {
            id: asNonEmptyString(row.url) ?? `fmp-news-${index}-${publishedAt}`,
            headline,
            source: asNonEmptyString(row.site ?? row.source) ?? "fmp",
            symbols,
            publishedAt,
          };
          const url = asNonEmptyString(row.url);
          if (url) item.url = url;
          const summary = asNonEmptyString(row.text ?? row.summary);
          if (summary) item.summary = summary;
          return item;
        })
        .filter((row): row is NewsItem => row != null);

      return { news, warnings: result.warnings };
    },
  };
}

function emptyFinancialsBundle(
  symbol: string,
  period: FmpStatementPeriod,
): FmpFinancialsBundle {
  return {
    symbol: symbol.trim().toUpperCase(),
    period,
    incomeStatements: [],
    balanceSheets: [],
    cashFlowStatements: [],
    keyMetrics: [],
    ratios: [],
    enterpriseValues: [],
  };
}

export type FmpProvider = ReturnType<typeof createFmpProvider>;
