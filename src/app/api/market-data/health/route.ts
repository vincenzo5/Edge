import { NextResponse } from "next/server";
import { jsonErrorResponse } from "@/lib/api/safeErrorResponse";
import { getServerCacheHealthSnapshot } from "@/lib/marketData/cache/serverCacheHealth";
import { ensureServerCacheBackendsInitialized } from "@/lib/marketData/cache/serverCacheBackends";
import {
  buildProviderRows,
  collectRecentWarnings,
  type ServerHealthPayload,
} from "@/lib/marketData/health";
import { getDeliveryRegistry } from "@/lib/marketData/state/deliveryRegistry";
import { twsHealthGate } from "@/lib/marketData/providers/tws/healthGate";
import { deriveTwsSystemLifecycle } from "@/lib/marketData/providers/tws/lifecycle";
import { getTwsRecoverySession } from "@/lib/marketData/providers/tws/recoverySession";
import { createTwsClient, isTwsConfigured } from "@/lib/marketData/providers/tws/client";
import { getServerMarketDataService } from "@/lib/marketData/service/server";
import { nextHealthRevision } from "@/lib/marketData/healthRevision";
import {
  redactDiagnostic,
  redactDiagnosticList,
} from "@/lib/api/redactDiagnostic";
import type { TwsStatusProbe } from "@/lib/marketData/providers/tws/client";

export const runtime = "nodejs";

function sanitizePublicTwsStatus(status: TwsStatusProbe): TwsStatusProbe {
  return {
    configured: status.configured,
    sidecarReachable: status.sidecarReachable,
    gatewayConnected: status.gatewayConnected,
    observationConfidence: status.observationConfidence,
    observedAt: status.observedAt,
    circuitBypassed: status.circuitBypassed,
    apiSessionConnected: status.apiSessionConnected,
    gatewaySocketOpen: status.gatewaySocketOpen,
    connectionState: status.connectionState,
    subscriptionsLost: status.subscriptionsLost,
    restartRequired: status.restartRequired,
    readOnly: status.readOnly,
    message: status.message ? redactDiagnostic(status.message) : undefined,
    warnings: redactDiagnosticList(status.warnings),
    reconnectInProgress: status.reconnectInProgress,
    reconnectTimedOut: status.reconnectTimedOut,
    diagnostics: status.diagnostics
      ? {
          workerWedged: status.diagnostics.workerWedged,
          lastWorkerError: status.diagnostics.lastWorkerError
            ? redactDiagnostic(status.diagnostics.lastWorkerError)
            : status.diagnostics.lastWorkerError,
          recovery: status.diagnostics.recovery
            ? {
                phase: status.diagnostics.recovery.phase,
                startedAt: status.diagnostics.recovery.startedAt,
                updatedAt: status.diagnostics.recovery.updatedAt,
                message: status.diagnostics.recovery.message
                  ? redactDiagnostic(status.diagnostics.recovery.message)
                  : status.diagnostics.recovery.message,
                pausedStreams: status.diagnostics.recovery.pausedStreams,
              }
            : undefined,
        }
      : undefined,
    connections: status.connections
      ? Object.fromEntries(
          Object.entries(status.connections).map(([connectionId, connection]) => [
            connectionId,
            {
              connectionId,
              gatewayConnected: connection.gatewayConnected,
              apiSessionConnected: connection.apiSessionConnected,
              gatewaySocketOpen: connection.gatewaySocketOpen,
              message: connection.message
                ? redactDiagnostic(connection.message)
                : connection.message,
              connectionState: connection.connectionState,
              observationConfidence: connection.observationConfidence,
              observedAt: connection.observedAt,
              subscriptionsLost: connection.subscriptionsLost,
              lastIbErrorCode: connection.lastIbErrorCode,
              lastIbErrorMessage: connection.lastIbErrorMessage
                ? redactDiagnostic(connection.lastIbErrorMessage)
                : connection.lastIbErrorMessage,
            },
          ]),
        )
      : undefined,
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    await ensureServerCacheBackendsInitialized();
    const service = getServerMarketDataService();
    const recoveryActive = getTwsRecoverySession() != null;
    const url = new URL(request.url);
    const forceRecovery = url.searchParams.get("recovery") === "1" || recoveryActive;
    const twsResult = await service.getTwsStatusProbe({ bypassCircuit: forceRecovery });

    const generatedAt = Date.now();
    const deliveryRegistry = getDeliveryRegistry();
    const deliveryDiagnostics = deliveryRegistry.getSanitizedSnapshot().datasets;
    const providers = buildProviderRows({
      tws: twsResult.data,
      twsGate: twsHealthGate.snapshot(),
      fmpConfigured: Boolean(process.env.FMP_API_KEY),
      fredConfigured: Boolean(process.env.FRED_API_KEY),
      secConfigured: Boolean(process.env.SEC_USER_AGENT),
      massiveConfigured: Boolean(process.env.MASSIVE_API_KEY ?? process.env.POLYGON_API_KEY),
      ibkrConfigured: process.env.IBKR_ENABLED === "true",
      deliveryDiagnostics,
    }).map((provider) => ({
      ...provider,
      detail: redactDiagnostic(provider.detail),
      circuitReason: provider.circuitReason
        ? redactDiagnostic(provider.circuitReason)
        : provider.circuitReason,
    }));

    const recentWarnings = redactDiagnosticList(
      collectRecentWarnings([], providers, [
        ...twsResult.warnings,
        ...twsResult.data.warnings,
      ]),
    );

    const healthProbe = isTwsConfigured()
      ? await createTwsClient().probeHealth(2_000)
      : { ok: false };

    const cache = await getServerCacheHealthSnapshot();

    const payload: ServerHealthPayload = {
      generatedAt,
      revision: nextHealthRevision(generatedAt),
      providers,
      recentWarnings,
      cache,
      lifecycle: deriveTwsSystemLifecycle({
        health: healthProbe,
        status: twsResult.data,
        recoveryActive,
      }),
      twsStatus: sanitizePublicTwsStatus(twsResult.data),
      deliveryDiagnostics,
      operationalReliability: deliveryRegistry.getOperationalReport(generatedAt),
    };

    return NextResponse.json({ ok: true, health: payload });
  } catch (error) {
    return jsonErrorResponse(error, "Failed to fetch data health", 500);
  }
}
