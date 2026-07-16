import "server-only";

import {
  getBrokerageClient,
  probeSidecarLiveness,
  BrokerageRequestError,
} from "@/lib/brokerage/brokerageClient";
import { awaitSidecarForBrokerage } from "@/lib/marketData/providers/tws/startup";
import { getServerMarketDataService } from "@/lib/marketData/service/server";
import { DEFAULT_RISK_SETTINGS } from "@/lib/risk/riskSettings";
import { evaluateTradingReadiness } from "@/lib/tradingSafety/tradingReadiness";
import { createIbTwsTradingAdapter } from "./adapters/ibTws";
import { appendAudit } from "./auditLog";
import {
  listIbConnections,
  IB_LIVE_CONNECTION_ID,
  resolveConnectionByEnvironment,
  isTradingConfigured,
} from "./connectionRegistry";
import {
  resolveServerIntentStore,
  resetServerIntentStoreForTests,
  type OrderIntentStore,
} from "./intentStore";
import { isReconcilableError, reconcileIntentWithBroker } from "./reconcile";
import { assertCoveredSell, pdtWarnings } from "./safetyGuards";
import type { BrokerTradingPort } from "./ports";
import type {
  OrderDraft,
  OrderIntent,
  OrderPreview,
  PlacedOrderResult,
  TradingAccount,
  TradingEnvironment,
} from "./types";
import {
  assertLiveConfirmation,
  assertTradingEnabledForEnvironment,
  assertTradingKillSwitchOff,
  draftsMatchForSubmit,
  isPaperTradingConfigured,
  parseOrderDraft,
  parseOrderModifyPatch,
  PREVIEW_INTENT_MAX_AGE_MS,
  TradingKillSwitchError,
  TradingValidationError,
} from "./validateOrder";

export class TradingReadinessBlockedError extends Error {
  readonly reasons: string[];

  constructor(reasons: string[]) {
    super(reasons.join("; "));
    this.name = "TradingReadinessBlockedError";
    this.reasons = reasons;
  }
}

export { TradingKillSwitchError };

export class TradingService {
  private storeOverride: OrderIntentStore | null;
  private storeCached: OrderIntentStore | null = null;

  constructor(store?: OrderIntentStore) {
    this.storeOverride = store ?? null;
  }

  private async intentStore(): Promise<OrderIntentStore> {
    if (this.storeOverride) return this.storeOverride;
    if (!this.storeCached) {
      this.storeCached = await resolveServerIntentStore();
    }
    return this.storeCached;
  }

  isTradingEnabled(): boolean {
    return isTradingConfigured();
  }

  private portForEnvironment(environment: TradingEnvironment): BrokerTradingPort {
    const connection = resolveConnectionByEnvironment(environment);
    return createIbTwsTradingAdapter(connection.connectionId);
  }

  async listAccounts(environment?: TradingEnvironment): Promise<TradingAccount[]> {
    this.ensureTradingEnabled();
    await awaitSidecarForBrokerage();
    const client = getBrokerageClient();
    if (!client) {
      throw new BrokerageRequestError("disabled", "Brokerage tracking unavailable.");
    }
    const live = await probeSidecarLiveness(client.getConfig(), 2_000);
    if (!live) {
      throw new BrokerageRequestError(
        "sidecar_unreachable",
        "TWS sidecar did not respond to /status within 2s.",
      );
    }

    const targets = environment
      ? [resolveConnectionByEnvironment(environment)]
      : listIbConnections();

    const accounts: TradingAccount[] = [];
    let liveDiscoveryFailed = false;

    for (const connection of targets) {
      try {
        const adapter = createIbTwsTradingAdapter(connection.connectionId);
        const rows = await adapter.listAccounts();
        accounts.push(
          ...rows.map((row) => ({
            ...row,
            availability: row.availability ?? ("online" as const),
          })),
        );
      } catch {
        if (connection.connectionId === IB_LIVE_CONNECTION_ID) {
          liveDiscoveryFailed = true;
        }
        // Live gateway may be offline — omit unavailable connection.
      }
    }

    if (liveDiscoveryFailed) {
      const offlineLiveId = process.env.TWS_LIVE_ACCOUNT_ID?.trim();
      const hasLiveRow = accounts.some((row) => row.environment === "live");
      if (offlineLiveId && !hasLiveRow) {
        accounts.push({
          broker: "ib",
          connectionId: IB_LIVE_CONNECTION_ID,
          accountId: offlineLiveId,
          environment: "live",
          availability: "offline",
        });
      }
    }

    return accounts;
  }

  async previewOrder(input: unknown): Promise<{ preview: OrderPreview; intent: OrderIntent }> {
    let accountId = "unknown";
    try {
      const draft = parseOrderDraft(input);
      accountId = draft.accountId;
      this.ensureTradingEnabled(draft.environment);
      const port = this.portForEnvironment(draft.environment);
      const { pdtWarns } = await this.assertPreTrade(draft);
      const store = await this.intentStore();
      const intent = await store.createIntent(
        draft,
        `preview:${draft.accountId}:${Date.now()}`,
      );
      const previewResult = await port.preview(intent.draft);
      const preview: OrderPreview = {
        ...previewResult,
        warnings: [...previewResult.warnings, ...pdtWarns],
      };
      const updated = await store.updateIntent(intent.intentId, { status: "previewed" });
      appendAudit({
        action: "preview",
        outcome: "success",
        accountId: draft.accountId,
        intentId: intent.intentId,
        orderRef: intent.orderRef,
      });
      return {
        preview,
        intent: updated ?? intent,
      };
    } catch (error) {
      this.auditBlockedOrFailed("preview", accountId, error);
      throw error;
    }
  }

  async submitOrder(
    draftInput: unknown,
    idempotencyKey: string,
    previewIntentId?: string,
    liveConfirmation?: string,
  ): Promise<PlacedOrderResult> {
    const draft = parseOrderDraft(draftInput);
    assertLiveConfirmation(draft.environment, liveConfirmation);

    const store = await this.intentStore();
    const existing = await store.getByIdempotencyKey(idempotencyKey);
    if (existing?.status === "submitted" && existing.orderId != null) {
      return {
        order: {
          orderId: existing.orderId,
          permId: existing.permId ?? null,
          account: draft.accountId,
          action: draft.side,
          totalQuantity: draft.quantity,
          orderType: draft.orderType,
          status: "Submitted",
        },
        orderRef: existing.orderRef,
        intent: existing,
      };
    }

    try {
      this.ensureTradingEnabled(draft.environment);
      if (previewIntentId) {
        await this.validatePreviewIntent(draft, previewIntentId);
      }
      await this.assertPreTrade(draft);
      const port = this.portForEnvironment(draft.environment);

      const intent = await store.createIntent(draft, idempotencyKey);
      const draftWithRef = { ...intent.draft, orderRef: intent.orderRef };

      try {
        const placed = await port.place(draftWithRef);
        const updated =
          (await store.updateIntent(intent.intentId, {
            status: "submitted",
            orderId: placed.order.orderId ?? null,
            permId: placed.order.permId ?? null,
            orderRef: placed.orderRef,
          })) ?? intent;

        appendAudit({
          action: "submit",
          outcome: "success",
          accountId: draft.accountId,
          intentId: intent.intentId,
          orderRef: placed.orderRef,
        });

        return {
          order: placed.order,
          orderRef: placed.orderRef,
          intent: updated,
        };
      } catch (error) {
        if (isReconcilableError(error)) {
          const reconciled = await this.tryReconcileIntent(intent, draft.accountId, port);
          if (reconciled) {
            appendAudit({
              action: "submit",
              outcome: "success",
              accountId: draft.accountId,
              intentId: intent.intentId,
              orderRef: reconciled.orderRef,
              detail: "reconciled after timeout",
            });
            return reconciled;
          }
        }
        await store.updateIntent(intent.intentId, { status: "failed" });
        appendAudit({
          action: "submit",
          outcome: "failed",
          accountId: draft.accountId,
          intentId: intent.intentId,
          orderRef: intent.orderRef,
          detail: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    } catch (error) {
      if (!(error instanceof TradingValidationError) || !error.message.includes("preview")) {
        this.auditBlockedOrFailed("submit", draft.accountId, error);
      }
      throw error;
    }
  }

  async modifyOrder(
    accountId: string,
    orderId: number,
    patchInput: unknown,
    intentId?: string,
    environment: TradingEnvironment = "paper",
    liveConfirmation?: string,
  ): Promise<{ order: PlacedOrderResult["order"]; intent: OrderIntent | null }> {
    try {
      assertLiveConfirmation(environment, liveConfirmation);
      this.ensureTradingEnabled(environment);
      await awaitSidecarForBrokerage();
      const patch = parseOrderModifyPatch(patchInput);
      const port = this.portForEnvironment(environment);
      const result = await port.modify(accountId, orderId, patch);
      const store = await this.intentStore();
      const intent =
        intentId != null
          ? await store.updateIntent(intentId, { status: "submitted" })
          : null;
      appendAudit({
        action: "modify",
        outcome: "success",
        accountId,
        intentId: intentId ?? undefined,
      });
      return { order: result.order, intent };
    } catch (error) {
      this.auditBlockedOrFailed("modify", accountId, error);
      throw error;
    }
  }

  private async tryReconcileIntent(
    intent: OrderIntent,
    accountId: string,
    port: BrokerTradingPort,
  ): Promise<PlacedOrderResult | null> {
    try {
      const orders = await port.listOpenOrders(accountId);
      const patch = reconcileIntentWithBroker(intent, orders);
      if (!patch) return null;
      const store = await this.intentStore();
      const updated = (await store.updateIntent(intent.intentId, patch)) ?? intent;
      return {
        order: {
          orderId: updated.orderId ?? null,
          permId: updated.permId ?? null,
          account: accountId,
          action: updated.draft.side,
          totalQuantity: updated.draft.quantity,
          orderType: updated.draft.orderType,
          status: "Submitted",
        },
        orderRef: updated.orderRef,
        intent: updated,
      };
    } catch {
      return null;
    }
  }

  async cancelOrder(
    accountId: string,
    orderId: number,
    intentId?: string,
    environment: TradingEnvironment = "paper",
    liveConfirmation?: string,
  ): Promise<{ order: PlacedOrderResult["order"]; intent: OrderIntent | null }> {
    try {
      assertLiveConfirmation(environment, liveConfirmation);
      this.ensureTradingEnabled(environment);
      await awaitSidecarForBrokerage();
      const port = this.portForEnvironment(environment);
      const result = await port.cancel(accountId, orderId);
      const store = await this.intentStore();
      const intent =
        intentId != null
          ? await store.updateIntent(intentId, { status: "cancelled" })
          : null;
      appendAudit({
        action: "cancel",
        outcome: "success",
        accountId,
        intentId: intentId ?? undefined,
      });
      return { order: result.order, intent };
    } catch (error) {
      this.auditBlockedOrFailed("cancel", accountId, error);
      throw error;
    }
  }

  private ensureTradingEnabled(environment: TradingEnvironment = "paper"): void {
    assertTradingEnabledForEnvironment(environment);
    assertTradingKillSwitchOff();
  }

  private async validatePreviewIntent(
    draft: OrderDraft,
    previewIntentId: string,
  ): Promise<void> {
    const store = await this.intentStore();
    const previewIntent = await store.getById(previewIntentId);
    if (!previewIntent) {
      throw new TradingValidationError(`Preview intent ${previewIntentId} not found`);
    }
    if (previewIntent.status !== "previewed") {
      throw new TradingValidationError(
        `Preview intent ${previewIntentId} is not in previewed status`,
      );
    }
    if (!draftsMatchForSubmit(draft, previewIntent.draft)) {
      throw new TradingValidationError(
        "Submit draft does not match the previewed order",
      );
    }
    const ageMs = Date.now() - previewIntent.updatedAt;
    if (ageMs > PREVIEW_INTENT_MAX_AGE_MS) {
      throw new TradingValidationError(
        `Preview expired (${ageMs}ms > ${PREVIEW_INTENT_MAX_AGE_MS}ms)`,
      );
    }
  }

  private async assertPreTrade(
    draft: OrderDraft,
  ): Promise<{ pdtWarns: string[] }> {
    await awaitSidecarForBrokerage();

    const connection = resolveConnectionByEnvironment(draft.environment);
    const client = getBrokerageClient(connection.connectionId);
    if (!client) {
      throw new BrokerageRequestError("disabled", "Brokerage tracking unavailable.");
    }

    const preTradeFetchedAt = Date.now();
    const [status, summary, quoteResult, positionsResult] = await Promise.all([
      client.getStatus(),
      client.getSummary(),
      getServerMarketDataService().getQuotes([draft.symbol], {
        twsConnectionId: connection.connectionId,
      }),
      client.getPositions(),
    ]);

    const quote = quoteResult.data[0];
    const readiness = evaluateTradingReadiness({
      brokerageConnected: status.connected,
      accountSummary: summary,
      accountUpdatedAt: Math.max(
        summary.updatedAt ?? 0,
        status.summaryUpdatedAt ?? 0,
        preTradeFetchedAt,
      ),
      riskSettings: DEFAULT_RISK_SETTINGS,
      quote: quote
        ? {
            source: quoteResult.source,
            asOf: quoteResult.receivedAt ?? quoteResult.asOf ?? quote.updatedAt,
            receivedAt: quoteResult.receivedAt,
            stale: quoteResult.stale,
            warnings: quoteResult.warnings,
          }
        : undefined,
    });

    if (!readiness.ok) {
      throw new TradingReadinessBlockedError(readiness.reasons);
    }

    assertCoveredSell(draft, positionsResult.positions);

    return { pdtWarns: pdtWarnings(summary) };
  }

  private auditBlockedOrFailed(
    action: "preview" | "submit" | "modify" | "cancel",
    accountId: string,
    error: unknown,
  ): void {
    const outcome =
      error instanceof TradingReadinessBlockedError ||
      error instanceof TradingValidationError ||
      error instanceof TradingKillSwitchError
        ? "blocked"
        : "failed";
    appendAudit({
      action: outcome === "blocked" ? "blocked" : action,
      outcome,
      accountId,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

let singletonService: TradingService | null = null;

export function getTradingService(): TradingService {
  if (!singletonService) {
    singletonService = new TradingService();
  }
  return singletonService;
}

export function resetTradingServiceForTests(): void {
  singletonService = null;
  resetServerIntentStoreForTests();
}

export { isTradingConfigured, isPaperTradingConfigured };
