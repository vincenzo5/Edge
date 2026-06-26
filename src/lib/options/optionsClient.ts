import type {
  OptionContractSnapshot,
  OptionExpiration,
  OptionsChainResponse,
} from "@/lib/marketData/contracts/options";

export type OptionsDataMeta = {
  source?: string;
  stale?: boolean;
  warnings?: string[];
  asOf?: number;
};

export type OptionsExpirationsResult = {
  expirations: OptionExpiration[];
  meta?: OptionsDataMeta;
};

export type OptionsChainResult = {
  chain: OptionsChainResponse;
  meta?: OptionsDataMeta;
};

export async function fetchOptionExpirations(
  underlying: string,
): Promise<OptionsExpirationsResult> {
  const params = new URLSearchParams({ underlying });
  const res = await fetch(`/api/options/expirations?${params.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Options expirations request failed (${res.status})`);
  }
  return (await res.json()) as OptionsExpirationsResult;
}

export async function fetchOptionsChain(
  underlying: string,
  expiration: string,
  options?: {
    strikeWindow?: { mode: "full" } | { mode: "atm"; count?: number; spot?: number };
  },
): Promise<OptionsChainResult> {
  const params = new URLSearchParams({ underlying, expiration });
  if (options?.strikeWindow) {
    params.set("strikeWindow", JSON.stringify(options.strikeWindow));
  }
  const res = await fetch(`/api/options/chain?${params.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Options chain request failed (${res.status})`);
  }
  return (await res.json()) as OptionsChainResult;
}

export function expirationToTimestamp(expiration: string): number {
  return Date.parse(`${expiration}T16:00:00.000Z`);
}

export type StrikeRow = {
  strike: number;
  call?: OptionContractSnapshot;
  put?: OptionContractSnapshot;
};

export function groupContractsByStrike(
  contracts: OptionContractSnapshot[],
): StrikeRow[] {
  const byStrike = new Map<number, StrikeRow>();
  for (const contract of contracts) {
    const row = byStrike.get(contract.strike) ?? { strike: contract.strike };
    if (contract.type === "call") row.call = contract;
    else row.put = contract;
    byStrike.set(contract.strike, row);
  }
  return [...byStrike.values()].sort((a, b) => a.strike - b.strike);
}

export function formatOptionPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

export function formatOptionGreek(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(3);
}

export function formatOptionIv(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}
