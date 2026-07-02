import { NextResponse } from "next/server";
import {
  formatTwsRecoveryPhaseMessage,
  probeTwsRecoveryStatus,
} from "@/lib/marketData/providers/tws/recover";
import { finalizeTwsRecoveryIfNeeded } from "@/lib/marketData/providers/tws/finalizeTwsRecovery";
import {
  getTwsRecoverySession,
  updateTwsRecoveryPhase,
} from "@/lib/marketData/providers/tws/recoverySession";
import { isTwsConfigured } from "@/lib/marketData/providers/tws/client";
import { getServerMarketDataService } from "@/lib/marketData/service/server";

export const runtime = "nodejs";

/** Poll sidecar recovery status; finalize market data when Gateway connects. */
export async function GET(): Promise<Response> {
  if (!isTwsConfigured()) {
    return NextResponse.json({ error: "TWS is not configured" }, { status: 403 });
  }

  const status = await probeTwsRecoveryStatus();
  if (!status) {
    return NextResponse.json({
      ok: false,
      message: "Unable to probe TWS sidecar",
      status: {
        configured: true,
        sidecarReachable: false,
        gatewayConnected: false,
        warnings: ["Sidecar status unavailable"],
      },
    });
  }

  const session = getTwsRecoverySession();
  const message = formatTwsRecoveryPhaseMessage(status);
  let warmup = null;
  let finalized = false;

  if (session && status.gatewayConnected && !session.finalized) {
    updateTwsRecoveryPhase("confirmed");
    const service = getServerMarketDataService();
    const result = await finalizeTwsRecoveryIfNeeded(service, {
      symbols: session.symbols,
      candleRequests: session.candleRequests,
      optionsSymbol: session.optionsSymbol,
    });
    warmup = result.warmup;
    finalized = result.finalized;
  } else if (status.diagnostics?.workerWedged) {
    updateTwsRecoveryPhase("worker_wedged");
  } else if (status.reconnectInProgress || status.diagnostics?.recovery?.phase === "reconnecting") {
    updateTwsRecoveryPhase("reconnect_in_progress");
  } else if (!status.sidecarReachable) {
    updateTwsRecoveryPhase("sidecar_unresponsive");
  }

  return NextResponse.json({
    ok: status.gatewayConnected,
    message,
    finalized,
    recoveryPhase: session?.lastPhase,
    status,
    warmup,
  });
}
