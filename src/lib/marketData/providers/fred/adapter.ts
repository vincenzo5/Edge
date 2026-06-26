import type { MacroSeries, EconomicRelease } from "../../contracts/macro";
import { asFiniteNumber, asNonEmptyString } from "../../validation/parseRequest";

const FRED_BASE = "https://api.stlouisfed.org/fred";

function fredApiKey(): string | null {
  const key = process.env.FRED_API_KEY?.trim();
  return key ? key : null;
}

async function fredGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const apiKey = fredApiKey();
  if (!apiKey) {
    throw new Error("FRED_API_KEY is not configured");
  }
  const url = new URL(`${FRED_BASE}/${path}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`FRED request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export function createFredProvider() {
  return {
    isConfigured(): boolean {
      return fredApiKey() != null;
    },

    async getSeries(seriesId: string, limit = 120): Promise<MacroSeries | null> {
      if (!this.isConfigured()) return null;
      const [seriesMeta, observationsPayload] = await Promise.all([
        fredGet<{ seriess?: Array<Record<string, unknown>> }>("series", {
          series_id: seriesId,
        }),
        fredGet<{ observations?: Array<Record<string, unknown>> }>(
          "series/observations",
          {
            series_id: seriesId,
            sort_order: "desc",
            limit: String(limit),
          },
        ),
      ]);

      const meta = seriesMeta.seriess?.[0];
      const observations = (observationsPayload.observations ?? [])
        .map((row) => ({
          date: asNonEmptyString(row.date) ?? "",
          value:
            row.value === "." ? null : asFiniteNumber(Number(row.value)),
        }))
        .filter((row) => row.date !== "")
        .reverse();

      return {
        seriesId,
        title: asNonEmptyString(meta?.title) ?? seriesId,
        units: asNonEmptyString(meta?.units) ?? undefined,
        frequency: asNonEmptyString(meta?.frequency) ?? undefined,
        observations,
        source: "fred",
        updatedAt: Date.now(),
      };
    },

    async getReleases(limit = 20): Promise<EconomicRelease[]> {
      if (!this.isConfigured()) return [];
      const payload = await fredGet<{ releases?: Array<Record<string, unknown>> }>(
        "releases",
        {
          limit: String(limit),
          order_by: "release_date",
          sort_order: "desc",
        },
      );
      return (payload.releases ?? [])
        .map((row) => {
          const releaseId = asNonEmptyString(row.id);
          const name = asNonEmptyString(row.name);
          const date = asNonEmptyString(row.release_date ?? row.last_updated);
          if (!releaseId || !name || !date) return null;
          return {
            releaseId,
            name,
            date,
            source: "fred",
          } satisfies EconomicRelease;
        })
        .filter((row): row is EconomicRelease => row != null);
    },
  };
}

export type FredProvider = ReturnType<typeof createFredProvider>;
