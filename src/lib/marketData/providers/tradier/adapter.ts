import type { OptionExpiration, OptionsChainRequest, OptionsChainResponse } from "../../contracts/options";
import { mapRawTradierOption } from "../yahoo/adapter";
import { asNonEmptyString } from "../../validation/parseRequest";

function tradierToken(): string | null {
  const token = process.env.TRADIER_ACCESS_TOKEN?.trim();
  return token ? token : null;
}

function tradierBaseUrl(): string {
  return (
    process.env.TRADIER_API_URL?.trim() ??
    "https://sandbox.tradier.com/v1"
  );
}

async function tradierGet(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const token = tradierToken();
  if (!token) {
    throw new Error("TRADIER_ACCESS_TOKEN is not configured");
  }
  const url = new URL(`${tradierBaseUrl()}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Tradier request failed (${res.status})`);
  }
  return res.json();
}

function extractOptionRows(payload: unknown): Record<string, unknown>[] {
  const root = payload as Record<string, unknown>;
  const options = root.options as Record<string, unknown> | undefined;
  const option = options?.option;
  if (Array.isArray(option)) return option as Record<string, unknown>[];
  if (option && typeof option === "object") return [option as Record<string, unknown>];
  return [];
}

export function createTradierOptionsProvider() {
  return {
    isConfigured(): boolean {
      return tradierToken() != null;
    },

    async getExpirations(underlying: string): Promise<OptionExpiration[]> {
      const payload = (await tradierGet("/markets/options/expirations", {
        symbol: underlying.toUpperCase(),
      })) as Record<string, unknown>;
      const expirationsRoot = payload.expirations as Record<string, unknown> | undefined;
      const dates = expirationsRoot?.date;
      const list = Array.isArray(dates) ? dates : dates ? [dates] : [];
      return list
        .map((date) => asNonEmptyString(date))
        .filter((date): date is string => Boolean(date))
        .map((expiration) => ({
          underlying: underlying.toUpperCase(),
          expiration,
        }));
    },

    async getChain(request: OptionsChainRequest): Promise<OptionsChainResponse> {
      const underlying = request.underlying.toUpperCase();
      const expiration = request.expiration?.trim() ?? "";
      if (!expiration) {
        return { underlying, expiration: "", contracts: [] };
      }
      const payload = await tradierGet("/markets/options/chains", {
        symbol: underlying,
        expiration,
        greeks: "true",
      });
      const contracts = extractOptionRows(payload)
        .map((row) => mapRawTradierOption(row, underlying, expiration))
        .filter((row): row is NonNullable<typeof row> => row != null);

      return {
        underlying,
        expiration,
        contracts,
      };
    },
  };
}

export type TradierOptionsProvider = ReturnType<typeof createTradierOptionsProvider>;
