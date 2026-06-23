import type { FundamentalsSnapshot } from "./types";

export async function fetchFundamentals(symbol: string): Promise<FundamentalsSnapshot> {
  const params = new URLSearchParams({ symbol });
  const res = await fetch(`/api/fundamentals?${params.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Fundamentals request failed (${res.status})`);
  }
  return (await res.json()) as FundamentalsSnapshot;
}
