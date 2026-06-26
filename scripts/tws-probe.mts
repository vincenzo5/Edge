import { config } from "dotenv";
import { createTwsProvider } from "../src/lib/marketData/providers/tws/adapter.ts";

config({ path: ".env.local" });

async function main() {
  console.log("TWS probe — IB Gateway sidecar (not Client Portal Web API)");
  console.log("TWS_SIDECAR_URL:", process.env.TWS_SIDECAR_URL ?? "http://127.0.0.1:8765");
  console.log("TWS_HOST:", process.env.TWS_HOST ?? "127.0.0.1");
  console.log("TWS_PORT:", process.env.TWS_PORT ?? "4002");

  const provider = createTwsProvider();
  const status = await provider.getStatusProbe();
  if (!status.gatewayConnected && status.sidecarReachable) {
    // Status is lazy — attempt a contract resolve to establish the socket session.
    const contract = await provider.resolveContract("AAPL");
    if (contract) {
      const refreshed = await provider.getStatusProbe();
      if (refreshed.gatewayConnected) {
        Object.assign(status, refreshed);
      }
    }
  }

  console.log("\nSTATUS:", JSON.stringify(status, null, 2));

  if (!status.sidecarReachable) {
    console.error("\nSidecar not reachable. Run: npm run tws:sidecar-setup && npm run tws:sidecar");
    process.exit(1);
  }

  if (!status.gatewayConnected) {
    console.error(
      "\nSidecar reachable but IB Gateway not connected. Log in to IB Gateway paper and enable API access.",
    );
    process.exit(1);
  }

  const contract = await provider.resolveContract("AAPL");
  console.log("CONTRACT:", contract);
  if (!contract) {
    console.error("Failed to resolve AAPL contract");
    process.exit(1);
  }

  const quote = await provider.getQuote("AAPL");
  console.log("QUOTE:", quote);

  const candles = await provider.getCandlesForRange("AAPL", "1d", "1mo");
  console.log("CANDLES:", candles?.candles?.length ?? 0, "bars");
  if (!candles?.candles?.length) {
    console.error("No historical bars — check market data subscriptions / Gateway login");
    process.exit(1);
  }

  for (const symbol of ["AAPL", "TSLA", "SPY"]) {
    const batch = await provider.getQuotesBatch([symbol]);
    console.log(`QUOTE ${symbol}:`, batch.quotes[0] ?? batch.missingSymbols);
  }

  console.log("\nLIVE_TWS_VALIDATION: PASS");
}

main().catch((error) => {
  console.error("LIVE_TWS_VALIDATION: FAIL", error);
  process.exit(1);
});
