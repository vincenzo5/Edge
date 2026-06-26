import { config } from "dotenv";
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
  console.log("IBKR probe — Client Portal Gateway (not IB Gateway socket API)");
  console.log("IBKR_BASE_URL:", process.env.IBKR_BASE_URL);
  console.log("Port scan:", await checkPort(5001));
  console.log("Port 5000 (often AirPlay on macOS):", await checkPort(5000));

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
        "\nGateway not reachable. Run: npm run ibkr:gateway (Client Portal Gateway, not IB Gateway 10.40).",
      );
    }
    process.exit(1);
  }

  const contract = await provider.resolveContract("AAPL");
  console.log("CONTRACT:", contract);
  if (!contract) {
    console.error("Failed to resolve AAPL conid");
    process.exit(1);
  }

  const quote = await provider.getQuote("AAPL");
  console.log("QUOTE:", quote);

  const candles = await provider.getCandlesForRange("AAPL", "1d", "1mo");
  console.log("CANDLES:", candles?.candles?.length ?? 0, "bars");
  if (!candles?.candles?.length) {
    console.error("No historical bars — check market data subscriptions / API acknowledgement");
    process.exit(1);
  }

  console.log("\nLIVE_VALIDATION: PASS");
}

main().catch((error) => {
  console.error("LIVE_VALIDATION: FAIL", error);
  process.exit(1);
});
