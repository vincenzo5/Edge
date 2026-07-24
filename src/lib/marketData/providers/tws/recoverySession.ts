import type { CandleRequest } from "../../contracts/equities";
import { recordOperationalRecovery } from "../../state/deliveryRegistry";
import { createSnapshotRevision, shouldAcceptSnapshot, type SnapshotRevision } from "../../state/revision";

export type TwsRecoverySession = {
  id: string;
  startedAt: number;
  revision: SnapshotRevision;
  symbols: string[];
  candleRequests: CandleRequest[];
  optionsSymbol?: string;
  finalized: boolean;
  outcomeRecorded: boolean;
  lastPhase?: string;
  phaseUpdatedAt?: number;
};

let activeSession: TwsRecoverySession | null = null;
let sessionSequence = 0;

export function startTwsRecoverySession(args: {
  symbols?: string[];
  candleRequests?: CandleRequest[];
  optionsSymbol?: string;
}): TwsRecoverySession {
  const startedAt = Date.now();
  sessionSequence += 1;
  activeSession = {
    id: `tws-recover-${startedAt}`,
    startedAt,
    revision: createSnapshotRevision(sessionSequence, startedAt),
    symbols: args.symbols ?? [],
    candleRequests: args.candleRequests ?? [],
    optionsSymbol: args.optionsSymbol,
    finalized: false,
    outcomeRecorded: false,
    phaseUpdatedAt: startedAt,
  };
  return activeSession;
}

export function getTwsRecoverySession(): TwsRecoverySession | null {
  return activeSession;
}

export function updateTwsRecoveryPhase(phase: string, at = Date.now()): boolean {
  if (!activeSession) return false;
  if (activeSession.finalized) return false;
  const failed = phase === "failed";
  if (failed && !activeSession.outcomeRecorded) {
    recordOperationalRecovery(at - activeSession.startedAt, false, at);
  }
  activeSession = {
    ...activeSession,
    lastPhase: phase,
    outcomeRecorded: activeSession.outcomeRecorded || failed,
    phaseUpdatedAt: at,
    revision: createSnapshotRevision(
      activeSession.revision.sequence + 1,
      at,
      activeSession.revision.epoch,
    ),
  };
  return true;
}

export function acceptRecoverySessionSnapshot(candidate: {
  sessionId?: string;
  revision?: SnapshotRevision;
  generatedAt: number;
}): boolean {
  if (!activeSession) return false;
  if (candidate.sessionId && candidate.sessionId !== activeSession.id) return false;
  if (
    candidate.revision &&
    !shouldAcceptSnapshot(
      { revision: candidate.revision, generatedAt: candidate.generatedAt },
      { revision: activeSession.revision, generatedAt: activeSession.phaseUpdatedAt ?? activeSession.startedAt },
    )
  ) {
    return false;
  }
  return true;
}

export function markTwsRecoveryFinalized(at = Date.now()): void {
  if (!activeSession) return;
  if (activeSession.finalized) return;
  if (!activeSession.outcomeRecorded) {
    recordOperationalRecovery(at - activeSession.startedAt, true, at);
  }
  activeSession = {
    ...activeSession,
    finalized: true,
    outcomeRecorded: true,
    lastPhase: "confirmed",
    phaseUpdatedAt: at,
    revision: createSnapshotRevision(
      activeSession.revision.sequence + 1,
      at,
      activeSession.revision.epoch,
    ),
  };
}

export function clearTwsRecoverySession(at = Date.now()): void {
  if (activeSession && !activeSession.finalized && !activeSession.outcomeRecorded) {
    recordOperationalRecovery(at - activeSession.startedAt, false, at);
  }
  activeSession = null;
}

export function resetTwsRecoverySessionForTests(): void {
  activeSession = null;
  sessionSequence = 0;
}
