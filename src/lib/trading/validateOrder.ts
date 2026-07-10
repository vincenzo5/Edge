import { z } from "zod";
import { OrderDraftSchema, OrderModifyPatchSchema, type OrderDraft, type OrderModifyPatch } from "./types";
import { isTradingEnvironmentConfigured } from "./connectionRegistry";

export class TradingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TradingValidationError";
  }
}

export class TradingKillSwitchError extends Error {
  constructor() {
    super("Trading is disabled by kill switch (EDGE_TRADING_KILL_SWITCH=true).");
    this.name = "TradingKillSwitchError";
  }
}

export function isTradingKillSwitchOn(): boolean {
  const raw = process.env.EDGE_TRADING_KILL_SWITCH?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

export function assertTradingKillSwitchOff(): void {
  if (isTradingKillSwitchOn()) {
    throw new TradingKillSwitchError();
  }
}

export function readTwsHost(): string {
  return process.env.TWS_HOST?.trim() || "127.0.0.1";
}

export function readTwsPaperPort(): number {
  const raw = process.env.TWS_PAPER_PORT?.trim() ?? process.env.TWS_PORT?.trim();
  const value = Number(raw ?? 4002);
  return Number.isFinite(value) ? value : 4002;
}

export function readTwsLivePort(): number {
  const raw = process.env.TWS_LIVE_PORT?.trim();
  const value = Number(raw ?? 4001);
  return Number.isFinite(value) ? value : 4001;
}

/** Legacy alias — paper port is the primary sidecar socket for market data. */
export function readTwsPort(): number {
  return readTwsPaperPort();
}

export function isTwsReadOnly(): boolean {
  const raw = process.env.TWS_READONLY?.trim().toLowerCase();
  return raw !== "false" && raw !== "0";
}

/** @deprecated Use isTradingConfigured / isTradingEnvironmentConfigured */
export function isPaperTradingConfigured(): boolean {
  return isTradingEnvironmentConfigured("paper");
}

/** @deprecated Use assertTradingEnabledForEnvironment */
export function assertPaperTradingEnabled(): void {
  assertTradingEnabledForEnvironment("paper");
}

export function assertTradingEnabledForEnvironment(
  environment: OrderDraft["environment"],
): void {
  if (!isTradingEnvironmentConfigured(environment)) {
    throw new TradingValidationError(
      "Trading requires TWS_READONLY=false for the IB API session.",
    );
  }
}

export const LIVE_CONFIRMATION_TOKEN = "LIVE";

export function assertLiveConfirmation(
  environment: OrderDraft["environment"],
  liveConfirmation?: string | null,
): void {
  if (environment !== "live") return;
  if (liveConfirmation?.trim() !== LIVE_CONFIRMATION_TOKEN) {
    throw new TradingValidationError(
      `Live trading requires liveConfirmation: "${LIVE_CONFIRMATION_TOKEN}"`,
    );
  }
}

export function parseOrderDraft(input: unknown): OrderDraft {
  const parsed = OrderDraftSchema.safeParse(input);
  if (!parsed.success) {
    throw new TradingValidationError(
      parsed.error.issues.map((issue) => issue.message).join("; "),
    );
  }
  assertTradingEnabledForEnvironment(parsed.data.environment);
  return parsed.data;
}

export function parseOrderModifyPatch(input: unknown): OrderModifyPatch {
  const parsed = OrderModifyPatchSchema.safeParse(input);
  if (!parsed.success) {
    throw new TradingValidationError(
      parsed.error.issues.map((issue) => issue.message).join("; "),
    );
  }
  return parsed.data;
}

export function normalizeDraftForHash(draft: OrderDraft): string {
  return JSON.stringify({
    accountId: draft.accountId.trim(),
    symbol: draft.symbol.trim().toUpperCase(),
    side: draft.side,
    quantity: draft.quantity,
    orderType: draft.orderType,
    limitPrice: draft.limitPrice ?? null,
    stopPrice: draft.stopPrice ?? null,
    outsideRth: draft.outsideRth ?? false,
    tif: draft.tif,
    environment: draft.environment,
  });
}

export function draftsMatchForSubmit(draft: OrderDraft, other: OrderDraft): boolean {
  return normalizeDraftForHash(draft) === normalizeDraftForHash(other);
}

export const PREVIEW_INTENT_MAX_AGE_MS = 30_000;
