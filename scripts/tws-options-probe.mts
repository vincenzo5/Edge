import { config } from "dotenv";
import { createTwsOptionsProvider } from "../src/lib/marketData/providers/tws/optionsProvider.ts";
import { optionsChainResponseSchema } from "../src/lib/marketData/schemas/response.ts";
import { createTwsProvider } from "../src/lib/marketData/providers/tws/adapter.ts";

config({ path: ".env.local" });

async function main() {
  console.log("TWS options probe — IB Gateway sidecar");
  console.log("TWS_SIDECAR_URL:", process.env.TWS_SIDECAR_URL ?? "http://127.0.0.1:8765");

  const provider = createTwsProvider();
  const status = await provider.getStatusProbe();
  console.log("\nSTATUS:", JSON.stringify(status, null, 2));

  if (!status.sidecarReachable) {
    console.error("\nSidecar not reachable. Run: npm run tws:sidecar");
    process.exit(1);
  }
  if (!status.gatewayConnected) {
    console.error("\nIB Gateway not connected. Log in to paper Gateway and enable API.");
    process.exit(1);
  }

  const options = createTwsOptionsProvider();
  const expirationsResult = await options.getExpirations("AAPL");
  console.log(
    "EXPIRATIONS:",
    expirationsResult.expirations.length,
    expirationsResult.expirations.slice(0, 5),
  );
  if (expirationsResult.warnings.length) {
    console.log("EXPIRATION WARNINGS:", expirationsResult.warnings);
  }
  if (expirationsResult.expirations.length === 0) {
    console.error("No AAPL option expirations from TWS");
    process.exit(1);
  }

  const expiration = expirationsResult.expirations[0]!.expiration;
  const chainResult = await options.getChain({
    underlying: "AAPL",
    expiration,
    strikeWindow: { mode: "atm", count: 10 },
  });
  console.log(
    "CHAIN:",
    expiration,
    "contracts=",
    chainResult.chain.contracts.length,
  );
  if (chainResult.warnings.length) {
    console.log("CHAIN WARNINGS:", chainResult.warnings.slice(0, 5));
  }
  if (chainResult.chain.contracts.length === 0) {
    console.error("No contracts returned for expiration", expiration);
    process.exit(1);
  }

  const validated = optionsChainResponseSchema.safeParse(chainResult.chain);
  if (!validated.success) {
    console.error("Chain failed response validation:", validated.error.flatten());
    process.exit(1);
  }

  const sample = chainResult.chain.contracts[0];
  console.log("SAMPLE CONTRACT:", {
    symbol: sample?.contractSymbol,
    type: sample?.type,
    strike: sample?.strike,
    bid: sample?.bid,
    ask: sample?.ask,
    delta: sample?.delta,
  });

  console.log("\nLIVE_TWS_OPTIONS_VALIDATION: PASS");
}

main().catch((error) => {
  console.error("LIVE_TWS_OPTIONS_VALIDATION: FAIL", error);
  process.exit(1);
});
