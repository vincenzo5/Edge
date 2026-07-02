import type { CandleRequest } from "../../contracts/equities";

export type TwsRecoverySession = {
  id: string;
  startedAt: number;
  symbols: string[];
  candleRequests: CandleRequest[];
  optionsSymbol?: string;
  finalized: boolean;
  lastPhase?: string;
};

let activeSession: TwsRecoverySession | null = null;

export function startTwsRecoverySession(args: {
  symbols?: string[];
  candleRequests?: CandleRequest[];
  optionsSymbol?: string;
}): TwsRecoverySession {
  activeSession = {
    id: `tws-recover-${Date.now()}`,
    startedAt: Date.now(),
    symbols: args.symbols ?? [],
    candleRequests: args.candleRequests ?? [],
    optionsSymbol: args.optionsSymbol,
    finalized: false,
  };
  return activeSession;
}

export function getTwsRecoverySession(): TwsRecoverySession | null {
  return activeSession;
}

export function updateTwsRecoveryPhase(phase: string): void {
  if (!activeSession) return;
  activeSession = { ...activeSession, lastPhase: phase };
}

export function markTwsRecoveryFinalized(): void {
  if (!activeSession) return;
  activeSession = { ...activeSession, finalized: true };
}

export function clearTwsRecoverySession(): void {
  activeSession = null;
}

export function resetTwsRecoverySessionForTests(): void {
  activeSession = null;
}
