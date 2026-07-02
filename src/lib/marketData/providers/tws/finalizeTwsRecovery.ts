import type { CandleRequest } from "../../contracts/equities";
import type { WarmupReport } from "../../telemetry/types";
import type { MarketDataService } from "../../service/marketDataService";
import { resetBrokerageHealthGate } from "@/lib/brokerage/brokerageHealthGate";
import {
  getTwsRecoverySession,
  markTwsRecoveryFinalized,
} from "./recoverySession";

export type TwsRecoveryFinalizeArgs = {
  symbols?: string[];
  candleRequests?: CandleRequest[];
  optionsSymbol?: string;
};

export type TwsRecoveryFinalizeResult = {
  finalized: boolean;
  alreadyFinalized: boolean;
  warmup: WarmupReport | null;
  warmupTimedOut?: boolean;
};

const RECOVERY_WARMUP_BUDGET_MS = 10_000;

/** Reset gates/cache and warm market data once per recovery session. */
export async function finalizeTwsRecoveryIfNeeded(
  service: MarketDataService,
  args: TwsRecoveryFinalizeArgs = {},
): Promise<TwsRecoveryFinalizeResult> {
  const session = getTwsRecoverySession();
  const symbols = args.symbols ?? session?.symbols ?? [];
  const candleRequests = args.candleRequests ?? session?.candleRequests ?? [];
  const optionsSymbol = args.optionsSymbol ?? session?.optionsSymbol;

  if (session?.finalized) {
    return { finalized: true, alreadyFinalized: true, warmup: null };
  }

  service.resetTwsRecoveryState({ symbols, candleRequests });
  resetBrokerageHealthGate();

  let warmupTimedOut = false;
  const warmup = await Promise.race([
    service.primeMarketData({
      symbols,
      candleRequests,
      optionsSymbol,
    }),
    new Promise<WarmupReport>((resolve) => {
      setTimeout(() => {
        warmupTimedOut = true;
        resolve({
          startedAt: Date.now(),
          totalMs: RECOVERY_WARMUP_BUDGET_MS,
          phases: [
            {
              name: "recovery.warmup",
              ms: RECOVERY_WARMUP_BUDGET_MS,
              ok: false,
              error: "Recovery warmup timed out — poll status for late completion",
            },
          ],
        });
      }, RECOVERY_WARMUP_BUDGET_MS);
    }),
  ]);

  markTwsRecoveryFinalized();

  return {
    finalized: true,
    alreadyFinalized: false,
    warmup,
    warmupTimedOut,
  };
}
