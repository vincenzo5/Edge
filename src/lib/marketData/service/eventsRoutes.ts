import type { CorporateEvent, MarketEvent, MarketEventsQuery } from "../contracts/events";
import type { NewsItem } from "../contracts/news";
import { createDataResult, type DataResult } from "../contracts/result";
import { buildCacheKey, cacheTtlMs } from "../cache";
import { globalDataCache } from "../cache/serverCacheBackends";
import { defaultFmpSecFilingDateWindow } from "../providers/fmp/client";
import {
  dedupeMarketEvents,
  defaultFamiliesForQuery,
  filterMarketEvents,
  marketEventToCorporateEvent,
  normalizeFmpCorporateEvent,
  normalizeFmpEconomicCalendarEvents,
  normalizeFmpSecFiling,
  normalizeFredReleases,
  normalizeSecFiling,
} from "../events";
import { PRIORITY_ONE_MACRO_IDS } from "../events/registry";
import { recordServiceDelivery } from "../state/serviceInstrumentation";
import { defaultMacroDateWindow } from "./marketDataServiceShared";
import type { MarketDataServiceHost } from "./marketDataServiceHost";

export async function getMarketEvents(svc: MarketDataServiceHost, 
  query: MarketEventsQuery,
): Promise<DataResult<MarketEvent[]>> {
  const requestedAt = Date.now();
  const families = defaultFamiliesForQuery(query);
  const includeCorporate = families.includes("corporate");
  const includeFiling = families.includes("filing");
  const includeMacro = families.includes("macro") && query.includeMacro === true;

  const warnings: string[] = [];
  const rawEvents: MarketEvent[] = [];
  const symbol = query.symbol?.trim().toUpperCase();

  const cacheKey = buildCacheKey([
    "market-events",
    symbol ?? "",
    query.from ?? "",
    query.to ?? "",
    families.join(","),
    query.canonicalIds?.join(",") ?? "",
    query.importance?.join(",") ?? "",
    includeMacro ? "macro" : "",
  ]);
  const cached = await Promise.resolve(globalDataCache.read<MarketEvent[]>("events", cacheKey));
  if (cached.hit && cached.value) {
    return createDataResult(cached.value, "edge-events", {
      requestedAt,
      asOf: cached.asOf,
    });
  }

  if (symbol && includeCorporate && svc.fmp.isConfigured()) {
    const fmpResult = await svc.fmp.getCorporateEvents({
      symbol,
      from: query.from,
      to: query.to,
    });
    warnings.push(...fmpResult.warnings);
    rawEvents.push(...fmpResult.events.map(normalizeFmpCorporateEvent));
  } else if (symbol && includeCorporate && !svc.fmp.isConfigured()) {
    warnings.push("FMP_API_KEY is not configured — corporate events unavailable");
  }

  if (symbol && includeFiling) {
    if (svc.sec.isConfigured()) {
      try {
        const secFilings = await svc.sec.getRecentFilings(symbol, 20);
        rawEvents.push(...secFilings.map(normalizeSecFiling));
      } catch (error) {
        warnings.push(
          error instanceof Error
            ? `SEC filings failed: ${error.message}`
            : "SEC filings failed",
        );
      }
    }

    if (svc.fmp.isConfigured()) {
      const filingWindow = defaultFmpSecFilingDateWindow({
        from: query.from,
        to: query.to,
      });
      try {
        const fmpFilings = await svc.fmp.getSecFilings({
          symbol,
          from: filingWindow.from,
          to: filingWindow.to,
          limit: 20,
        });
        warnings.push(...fmpFilings.warnings);
        for (const filing of fmpFilings.filings) {
          rawEvents.push(
            normalizeFmpSecFiling({
              symbol: filing.symbol,
              formType: filing.formType,
              filingDate: filing.filingDate,
              url: filing.url,
              cik: filing.cik,
              acceptedDate: filing.acceptedDate,
            }),
          );
        }
      } catch (error) {
        warnings.push(
          error instanceof Error
            ? `FMP SEC filings failed: ${error.message}`
            : "FMP SEC filings failed",
        );
      }
    }
  }

  if (includeMacro) {
    let hasFullMacroFromFmp = false;
    const fmpMacroIds = new Set<string>();

    if (svc.fmp.isConfigured()) {
      const { from, to } = defaultMacroDateWindow(query);
      try {
        const calendar = await svc.fmp.getEconomicCalendar({ from, to });
        warnings.push(...calendar.warnings);
        const fmpMacroEvents = normalizeFmpEconomicCalendarEvents(
          calendar.events.filter((row) => row.country === "US"),
        );
        rawEvents.push(...fmpMacroEvents);
        hasFullMacroFromFmp = fmpMacroEvents.some(
          (event) => event.coverageLevel === "full",
        );
        for (const event of fmpMacroEvents) {
          fmpMacroIds.add(event.canonicalId);
        }
      } catch (error) {
        warnings.push(
          error instanceof Error
            ? `FMP economic calendar failed: ${error.message}`
            : "FMP economic calendar failed",
        );
      }
    } else {
      warnings.push("FMP_API_KEY is not configured — macro calendar unavailable");
    }

    const missingPriorityIds = PRIORITY_ONE_MACRO_IDS.filter(
      (id) => !fmpMacroIds.has(id),
    );
    const shouldFetchFred =
      missingPriorityIds.length > 0 || !hasFullMacroFromFmp;

    if (shouldFetchFred && svc.fred.isConfigured()) {
      try {
        const releases = await svc.fred.getReleases(100);
        rawEvents.push(...normalizeFredReleases(releases));
      } catch (error) {
        warnings.push(
          error instanceof Error
            ? `FRED macro releases failed: ${error.message}`
            : "FRED macro releases failed",
        );
      }
    } else if (shouldFetchFred && !svc.fred.isConfigured() && !svc.fmp.isConfigured()) {
      warnings.push("FRED_API_KEY is not configured — macro events unavailable");
    }

    if (!hasFullMacroFromFmp) {
      warnings.push(
        "Macro event cards are partial via FRED fallback; FMP economic calendar unavailable or restricted",
      );
    }
  }

  const deduped = dedupeMarketEvents(rawEvents);
  const filtered = filterMarketEvents(deduped, { ...query, families });

  await Promise.resolve(globalDataCache.write("events", cacheKey, filtered, cacheTtlMs("events"), Date.now()));

  const sources = [...new Set(filtered.map((e) => e.source))];
  const sourceLabel = sources.length === 1 ? sources[0]! : sources.length > 1 ? "edge-events" : "none";

  return recordServiceDelivery(
    createDataResult(filtered, sourceLabel, { requestedAt, warnings }),
    "events_market",
    { transport: "request" },
  );
}


export async function getCorporateEvents(svc: MarketDataServiceHost, args: {
  symbol?: string;
  from?: string;
  to?: string;
}): Promise<DataResult<CorporateEvent[]>> {
  const result = await getMarketEvents(svc, {
    symbol: args.symbol,
    from: args.from,
    to: args.to,
    families: ["corporate", "filing"],
    includeMacro: false,
  });
  return createDataResult(
    result.data.map(marketEventToCorporateEvent),
    result.source,
    {
      requestedAt: result.requestedAt,
      receivedAt: result.receivedAt,
      asOf: result.asOf,
      stale: result.stale,
      warnings: result.warnings,
    },
  );
}


export async function getNews(svc: MarketDataServiceHost, args: {
  symbol?: string;
  limit?: number;
}): Promise<DataResult<NewsItem[]>> {
  const requestedAt = Date.now();
  if (!svc.fmp.isConfigured()) {
    return createDataResult([], "fmp", {
      requestedAt,
      warnings: ["FMP_API_KEY is not configured"],
    });
  }
  const cacheKey = buildCacheKey(["news", args.symbol ?? "all", args.limit ?? 20]);
  const cached = await Promise.resolve(globalDataCache.read<NewsItem[]>("news", cacheKey));
  if (cached.hit && cached.value) {
    return createDataResult(cached.value, "fmp", { requestedAt, asOf: cached.asOf });
  }
  const result = await svc.fmp.getNews(args);
  await Promise.resolve(globalDataCache.write("news", cacheKey, result.news, cacheTtlMs("news"), Date.now()));
  return recordServiceDelivery(
    createDataResult(result.news, "fmp", {
      requestedAt,
      warnings: result.warnings,
    }),
    "news_symbol",
    { transport: "request" },
  );
}

