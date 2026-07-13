import { NextResponse } from "next/server";
import { jsonErrorResponse } from "@/lib/api/safeErrorResponse";
import {
  buildProviderRows,
  collectRecentWarnings,
  type ServerHealthPayload,
} from "@/lib/marketData/health";
import { twsHealthGate } from "@/lib/marketData/providers/tws/healthGate";
import { deriveTwsSystemLifecycle } from "@/lib/marketData/providers/tws/lifecycle";
import { getTwsRecoverySession } from "@/lib/marketData/providers/tws/recoverySession";
import { createTwsClient } from "@/lib/marketData/providers/tws/client";
import { getServerMarketDataService } from "@/lib/marketData/service/server";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const service = getServerMarketDataService();
    const recoveryActive = getTwsRecoverySession() != null;
    const url = new URL(request.url);
    const forceRecovery = url.searchParams.get("recovery") === "1" || recoveryActive;
    const twsResult = await service.getTwsStatusProbe({ bypassCircuit: forceRecovery });

    const providers = buildProviderRows({
      tws: twsResult.data,
      twsGate: twsHealthGate.snapshot(),
      fmpConfigured: Boolean(process.env.FMP_API_KEY),
      fredConfigured: Boolean(process.env.FRED_API_KEY),
      secConfigured: Boolean(process.env.SEC_USER_AGENT),
    });

    const recentWarnings = collectRecentWarnings([], providers, [
      ...twsResult.warnings,
      ...twsResult.data.warnings,
    ]);

    const client = createTwsClient();
    const healthProbe = await client.probeHealth(2_000);

    const payload: ServerHealthPayload = {
      generatedAt: Date.now(),
      providers,
      recentWarnings,
      lifecycle: deriveTwsSystemLifecycle({
        health: healthProbe,
        status: twsResult.data,
        recoveryActive,
      }),
      twsStatus: twsResult.data,
    };

    return NextResponse.json({ ok: true, health: payload });
  } catch (error) {
    return jsonErrorResponse(error, "Failed to fetch data health", 500);
  }
}
