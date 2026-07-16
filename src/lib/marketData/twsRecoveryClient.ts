import { isTwsGatewayHealthy } from "./health";
import { emitTwsRecovery } from "./twsRecoveryBus";

const RECOVERY_POLL_INTERVAL_MS = 3_000;
const RECOVERY_POLL_DEADLINE_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type TwsRecoveryClientRequest = {
  symbols?: string[];
  candleRequests?: Array<{ symbol: string; interval: string; range?: string }>;
  optionsSymbol?: string;
  source?: string;
};

export type TwsRecoveryClientResult = {
  ok: boolean;
  commandState?: "accepted" | "timed_out" | "failed" | "confirmed";
  message?: string;
  error?: string;
  recoveryPhase?: string;
};

async function waitForRecoveryConfirmation(
  onProgress: (message: string) => void,
): Promise<boolean> {
  const deadline = Date.now() + RECOVERY_POLL_DEADLINE_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch("/api/market-data/tws/recover/status", { priority: "high" });
      if (res.ok) {
        const payload = (await res.json()) as {
          ok?: boolean;
          message?: string;
          finalized?: boolean;
          recoveryPhase?: string;
        };
        if (payload.message) {
          onProgress(payload.message);
        }
        if (payload.ok && payload.finalized) {
          return true;
        }
        if (payload.ok && payload.recoveryPhase === "confirmed") {
          return true;
        }
      }
    } catch {
      // Keep polling until deadline.
    }
    await sleep(RECOVERY_POLL_INTERVAL_MS);
  }
  return false;
}

async function waitForGatewayHealth(onProgress: (message: string) => void): Promise<boolean> {
  const confirmed = await waitForRecoveryConfirmation(onProgress);
  if (confirmed) return true;

  const deadline = Date.now() + RECOVERY_POLL_DEADLINE_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch("/api/market-data/health?recovery=1", { priority: "high" });
      if (res.ok) {
        const payload = (await res.json()) as {
          health?: { providers?: Array<{ id: string; status?: string; gatewayConnected?: boolean }> };
        };
        const tws = payload.health?.providers?.find((provider) => provider.id === "tws");
        if (isTwsGatewayHealthy(tws)) {
          return true;
        }
      }
    } catch {
      // Keep polling.
    }
    await sleep(RECOVERY_POLL_INTERVAL_MS);
  }
  return false;
}

/** Client-side TWS recovery — shared by header, Data Health, and chart overlay. */
export async function runTwsRecoveryClient(
  request: TwsRecoveryClientRequest = {},
): Promise<TwsRecoveryClientResult> {
  const source = request.source ?? "client";
  const emitProgress = (message: string) => {
    emitTwsRecovery("progress", { message, source });
  };

  emitTwsRecovery("started", { source });

  try {
    const res = await fetch("/api/market-data/tws/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbols: request.symbols ?? [],
        candleRequests: request.candleRequests ?? [],
        optionsSymbol: request.optionsSymbol,
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as TwsRecoveryClientResult;

    if (!res.ok) {
      const message = payload.error ?? "TWS recovery failed";
      emitTwsRecovery("failed", { message, source });
      return { ok: false, error: message, message };
    }

    if (payload.message) {
      emitProgress(payload.message);
    }

    const commandState = payload.commandState;
    if (payload.ok && commandState === "confirmed") {
      const message = payload.message ?? "Gateway connected. Market data reloaded.";
      emitTwsRecovery("completed", { message, source });
      return { ...payload, ok: true, message };
    }

    if (commandState === "timed_out" || commandState === "accepted") {
      const connected = await waitForGatewayHealth(emitProgress);
      if (connected) {
        const message = "Gateway connected. Market data reloaded.";
        emitTwsRecovery("completed", { message, source });
        return { ok: true, commandState: "confirmed", message };
      }
      const message =
        "Reconnect still in progress. Confirm IB Gateway is logged in, then check Data Health.";
      emitTwsRecovery("failed", { message, source });
      return { ok: false, commandState, message };
    }

    const message = payload.message ?? "Recovery incomplete";
    emitTwsRecovery(payload.ok ? "completed" : "failed", { message, source });
    return { ...payload, message };
  } catch {
    const message = "TWS recovery request failed";
    emitTwsRecovery("failed", { message, source });
    return { ok: false, error: message, message };
  }
}
