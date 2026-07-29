import type { ServerHealthPayload } from "./health";

/** Client-side peek at TWS circuit state from the market-data health payload. */
export async function fetchTwsCircuitOpen(): Promise<boolean> {
  try {
    const res = await fetch("/api/market-data/health", {
      cache: "no-store",
      priority: "high",
    });
    if (!res.ok) return false;
    const payload = (await res.json()) as { health?: ServerHealthPayload };
    const tws = payload.health?.providers.find((provider) => provider.id === "tws");
    return tws?.circuitOpen === true;
  } catch {
    return false;
  }
}
