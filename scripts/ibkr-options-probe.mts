import { config } from "dotenv";
import { createIbkrOptionsProvider } from "../src/lib/marketData/providers/ibkr/optionsProvider.ts";
import { optionsChainResponseSchema } from "../src/lib/marketData/schemas/response.ts";
import { createIbkrProvider } from "../src/lib/marketData/providers/ibkr/adapter.ts";
import { Agent, fetch as undiciFetch } from "undici";

config({ path: ".env.local" });

const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });

async function checkPort(port: number): Promise<string> {
  try {
    const res = await undiciFetch(`https://127.0.0.1:${port}/v1/api/tickle`, {
      dispatcher: insecureAgent,
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();
    const reachable = res.status === 200 || res.status === 401;
    return `port ${port}: HTTP ${res.status} reachable=${reachable} ${text.slice(0, 60)}`;
  } catch (error) {
    return `port ${port}: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function main() {
  console.log("IBKR options probe — Client Portal Gateway");
  console.log("IBKR_BASE_URL:", process.env.IBKR_BASE_URL);
  console.log("Port scan:", await checkPort(5001));

  const provider = createIbkrProvider();
  const status = await provider.getStatusProbe();
  console.log("\nSTATUS:", JSON.stringify(status, null, 2));

  if (!status.authenticated) {
    if (status.gatewayReachable) {
      console.error(
        "\nGateway is up but you are not logged in. Open https://localhost:5001, complete 2FA, then rerun.",
      );
    } else {
      console.error(
        "\nGateway not reachable. Run: npm run ibkr:gateway (Client Portal Gateway).",
      );
    }
    process.exit(1);
  }

  const options = createIbkrOptionsProvider();
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
    console.error("No AAPL option expirations from IBKR");
    process.exit(1);
  }

  const expiration = expirationsResult.expirations[0]!.expiration;
  const chainResult = await options.getChain({ underlying: "AAPL", expiration });
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
  });

  console.log("\nLIVE_OPTIONS_VALIDATION: PASS");
}

main().catch((error) => {
  console.error("LIVE_OPTIONS_VALIDATION: FAIL", error);
  process.exit(1);
});
