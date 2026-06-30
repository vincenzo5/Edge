#!/usr/bin/env node
/**
 * Probe FMP /company-screener comma-separated OR support for text filters.
 * Usage: FMP_API_KEY=... npx tsx scripts/fmp-screener-or-probe.mts
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const apiKey = process.env.FMP_API_KEY?.trim();
if (!apiKey) {
  console.error("FMP_API_KEY is required");
  process.exit(1);
}

async function runProbe(sector: string): Promise<number> {
  const params = new URLSearchParams({
    sector,
    limit: "5",
    apikey: apiKey,
  });
  const url = `https://financialmodelingprep.com/stable/company-screener?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("Request failed", sector, res.status);
    return -1;
  }
  const json = (await res.json()) as unknown[];
  return Array.isArray(json) ? json.length : 0;
}

const single = await runProbe("Technology");
const combined = await runProbe("Technology,Healthcare");

console.log(JSON.stringify({ singleTechnologyCount: single, combinedSectorCount: combined }, null, 2));
