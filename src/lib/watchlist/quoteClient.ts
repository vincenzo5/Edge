import type { FundamentalsSnapshot, QuoteSnapshot } from "./types";

export async function fetchQuotes(symbols: string[]): Promise<QuoteSnapshot[]> {
  const res = await fetch("/api/quotes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Quote request failed (${res.status})`);
  }
  const json = (await res.json()) as { quotes?: QuoteSnapshot[] };
  return json.quotes ?? [];
}
