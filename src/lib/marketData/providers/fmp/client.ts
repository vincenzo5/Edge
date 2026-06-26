import { asFiniteNumber, asNonEmptyString } from "../../validation/parseRequest";

export type FmpFetchResult<T> = {
  data: T;
  warnings: string[];
};

export function fmpApiKey(): string | null {
  const key = process.env.FMP_API_KEY?.trim();
  return key ? key : null;
}

export const FMP_BASE = "https://financialmodelingprep.com/stable";

/** FMP `/sec-filings-search/symbol` requires `from` and `to` on the stable API. */
export function defaultFmpSecFilingDateWindow(args: {
  from?: string;
  to?: string;
  lookbackDays?: number;
}): { from: string; to: string } {
  const today = new Date();
  const to = args.to ?? today.toISOString().slice(0, 10);
  if (args.from) {
    return { from: args.from, to };
  }
  const lookbackDays = args.lookbackDays ?? 90;
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - lookbackDays);
  return { from: start.toISOString().slice(0, 10), to };
}

export async function fmpGet<T>(
  path: string,
  params: Record<string, string> = {},
  options: { allowPlanErrors?: boolean } = {},
): Promise<FmpFetchResult<T>> {
  const apiKey = fmpApiKey();
  if (!apiKey) {
    throw new Error("FMP_API_KEY is not configured");
  }

  const url = new URL(`${FMP_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  url.searchParams.set("apikey", apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url);
  const text = await res.text();

  if (options.allowPlanErrors && (res.status === 402 || res.status === 403)) {
    const detail = text.slice(0, 200).replace(apiKey, "REDACTED");
    return {
      data: [] as T,
      warnings: [
        `FMP endpoint restricted (${res.status}): ${detail || "subscription required"}`,
      ],
    };
  }

  if (!res.ok) {
    throw new Error(`FMP request failed (${res.status})`);
  }

  if (!text.trim()) {
    return { data: [] as T, warnings: [] };
  }

  try {
    return { data: JSON.parse(text) as T, warnings: [] };
  } catch {
    throw new Error("FMP response was not valid JSON");
  }
}

export function num(value: unknown): number | null {
  return asFiniteNumber(value);
}

export function str(value: unknown): string | null {
  return asNonEmptyString(value);
}

export function fiscalYearFromRow(row: Record<string, unknown>): string | null {
  return str(row.fiscalYear) ?? str(row.calendarYear);
}

export function periodFromRow(row: Record<string, unknown>): string | null {
  return str(row.period);
}
