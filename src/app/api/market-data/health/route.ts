import { NextResponse } from "next/server";
import {
  buildProviderRows,
  collectRecentWarnings,
  type ServerHealthPayload,
} from "@/lib/marketData/health";
import { twsHealthGate } from "@/lib/marketData/providers/tws/healthGate";
import { getTwsRecoverySession } from "@/lib/marketData/providers/tws/recoverySession";
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

    const payload: ServerHealthPayload = {
      generatedAt: Date.now(),
      providers,
      recentWarnings,
    };

    return NextResponse.json({ ok: true, health: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch data health";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
