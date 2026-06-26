import type { SecCompanyFacts, SecFiling } from "../../contracts/fundamentals";
import { asNonEmptyString } from "../../validation/parseRequest";

const SEC_TICKERS_URL =
  "https://www.sec.gov/files/company_tickers.json";
const SEC_USER_AGENT =
  process.env.SEC_USER_AGENT ?? "EdgeChart/1.0 (contact@example.com)";

type TickerEntry = { cik_str: number; ticker: string; title: string };

let tickerCache: Map<string, TickerEntry> | null = null;
let tickerCacheAt = 0;
const TICKER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function loadTickerMap(): Promise<Map<string, TickerEntry>> {
  if (tickerCache && Date.now() - tickerCacheAt < TICKER_CACHE_TTL_MS) {
    return tickerCache;
  }
  const res = await fetch(SEC_TICKERS_URL, {
    headers: { "User-Agent": SEC_USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`SEC ticker map failed (${res.status})`);
  }
  const json = (await res.json()) as Record<string, TickerEntry>;
  const map = new Map<string, TickerEntry>();
  for (const entry of Object.values(json)) {
    map.set(entry.ticker.toUpperCase(), entry);
  }
  tickerCache = map;
  tickerCacheAt = Date.now();
  return map;
}

function padCik(cik: number): string {
  return String(cik).padStart(10, "0");
}

export function createSecProvider() {
  return {
    isConfigured(): boolean {
      return true;
    },

    async resolveCik(symbol: string): Promise<{ cik: string; title: string } | null> {
      const map = await loadTickerMap();
      const entry = map.get(symbol.trim().toUpperCase());
      if (!entry) return null;
      return { cik: padCik(entry.cik_str), title: entry.title };
    },

    async getCompanyFacts(symbol: string): Promise<SecCompanyFacts | null> {
      const resolved = await this.resolveCik(symbol);
      if (!resolved) return null;
      const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${resolved.cik}.json`;
      const res = await fetch(url, {
        headers: { "User-Agent": SEC_USER_AGENT, Accept: "application/json" },
      });
      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(`SEC company facts failed (${res.status})`);
      }
      const json = (await res.json()) as Record<string, unknown>;
      return {
        symbol: symbol.toUpperCase(),
        cik: resolved.cik,
        entityName: asNonEmptyString(json.entityName) ?? resolved.title,
        facts: (json.facts as Record<string, unknown> | undefined) ?? undefined,
      };
    },

    async getRecentFilings(symbol: string, limit = 10): Promise<SecFiling[]> {
      const resolved = await this.resolveCik(symbol);
      if (!resolved) return [];
      const url = `https://data.sec.gov/submissions/CIK${resolved.cik}.json`;
      const res = await fetch(url, {
        headers: { "User-Agent": SEC_USER_AGENT, Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`SEC submissions failed (${res.status})`);
      }
      const json = (await res.json()) as Record<string, unknown>;
      const recent = (json.filings as Record<string, unknown> | undefined)?.recent as
        | Record<string, unknown[]>
        | undefined;
      if (!recent) return [];

      const forms = (recent.form ?? []) as string[];
      const dates = (recent.filingDate ?? []) as string[];
      const accessions = (recent.accessionNumber ?? []) as string[];
      const primaryDocs = (recent.primaryDocument ?? []) as string[];

      const filings: SecFiling[] = [];
      for (let i = 0; i < forms.length && filings.length < limit; i++) {
        const form = forms[i];
        const filedAt = dates[i];
        const accessionNumber = accessions[i];
        if (!form || !filedAt || !accessionNumber) continue;
        const accessionPath = accessionNumber.replace(/-/g, "");
        filings.push({
          symbol: symbol.toUpperCase(),
          cik: resolved.cik,
          form,
          filedAt,
          accessionNumber,
          primaryDocument: primaryDocs[i],
          url: `https://www.sec.gov/Archives/edgar/data/${Number(resolved.cik)}/${accessionPath}/${primaryDocs[i] ?? ""}`,
        });
      }
      return filings;
    },
  };
}

export type SecProvider = ReturnType<typeof createSecProvider>;
