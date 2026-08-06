import { randomUUID } from "crypto";
import "server-only";

import { applyRiskPolicy } from "@/lib/risk/policy/applyRiskPolicy";
import {
  ApplyRiskPolicyRequestSchema,
  ArmPlannedScheduleRequestSchema,
  ClearPlannedBindingRequestSchema,
  PromotePlannedInstanceRequestSchema,
  SyncPlannedInstanceRequestSchema,
} from "@/lib/risk/policy/applyRequests";
import {
  CLASSIC_PROTECT_TEMPLATE_ID,
  getClassicProtectTemplate,
} from "@/lib/risk/policy/classicProtectTemplate";
import { resolveEntryScheduleFireAt } from "@/lib/risk/policy/resolveEntrySchedule";
import { evaluateSubmitProtectGate } from "@/lib/risk/policy/submitProtectGate";
import { playbookTemplateToRiskPolicyTemplateFull } from "@/lib/risk/policy/templateReview";
import type { RiskPolicyTemplate } from "@/lib/risk/policy/types";
import {
  getBrokerageClient,
  probeSidecarLiveness,
  BrokerageRequestError,
} from "@/lib/brokerage/brokerageClient";
import { shouldTryBrokerage } from "@/lib/brokerage/brokerageHealthGate";
import { awaitSidecarForBrokerage } from "@/lib/marketData/providers/tws/startup";
import { resolveDollarRisk } from "@/lib/risk/riskSettings";
import {
  accountGateBlockReasons,
  buildAccountGateEvaluationInput,
  evaluateAccountRiskGates,
  isRiskIncreasingEntry,
} from "@/lib/risk/accountRiskGates";
import { resolveServerRiskSettings } from "@/lib/risk/resolveServerRiskSettings";
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
  appendDemoJournalAccountIfMissing,
  isListAccountsInfrastructureError,
  resolveDemoJournalTradingAccount,
} from "./demoJournalAccount";
import {
  resolveServerIntentStore,
  resetServerIntentStoreForTests,
  type OrderIntentStore,
} from "./intentStore";
import {
  resolveServerPlaybookAutoManageStore,
  resetServerPlaybookAutoManageStoreForTests,
  isAutoManageEnabledForEnvironment,
  isEnvironmentKillActive,
  resolvePlaybookLiveConfirmation,
  type PatchPlaybookAutoManageInput,
  type PlaybookAutoManageSettings,
  type PlaybookAutoManageStore,
} from "./playbookAutoManageStore";
import {
  resolveServerPlaybookInstanceStore,
  resetServerPlaybookInstanceStoreForTests,
  createPlaybookInstanceId,
  type PlaybookInstanceStore,
} from "./playbookInstanceStore";
import {
  resolveServerPlaybookTemplateStore,
  resetServerPlaybookTemplateStoreForTests,
  CreatePlaybookTemplateSchema,
  PatchPlaybookTemplateSchema,
  type CreatePlaybookTemplateInput,
  type PatchPlaybookTemplateInput,
  type PlaybookTemplateStore,
} from "./playbookTemplateStore";
import { createPlaybookInstance, lockPositionPlan } from "./playbook/types";
import type { ManageStep, PlaybookInstance, PlaybookTemplate, PositionPlan } from "./playbook/types";
import { planPlaybookSteps } from "./playbook/planSteps";
import { resolvePlaybookTemplate, resolvePlaybookTemplateFromInstance } from "./playbook/resolveTemplate";
import { syncManagePlaybookToJournal } from "./playbook/journalRecipe";
import { buildManageNotifyAlertInputs } from "./playbook/manageNotifyAlerts";
import { initialManageStateForTemplate } from "./playbook/stepTrailRatchet";
import {
  buildFlattenDraftForInstance,
  ordersCorrelatedWithInstance,
  positionQtyForInstance,
} from "./exitAndCleanup";
import { buildManualStopPausePatch, detachAffectsProtectOrders, pauseAffectsProtectOrders } from "./playbook/conflictPolicy";
import {
  materializePlannedSchedules,
  promoteDuePlannedInstances,
  promotePlannedInstanceNow,
} from "./playbook/promotePlannedInstances";
import { runPlaybookEvaluation } from "./playbook/runPlaybookEvaluation";
import type { RuleRuntime } from "./playbook/types";
import { isReconcilableError, reconcileIntentWithBroker } from "./reconcile";
import { assertCoveredSell, pdtWarnings } from "./safetyGuards";
import type { BrokerTradingPort } from "./ports";
import type {
  BracketPlan,
  BracketPlacedResult,
  OrderDraft,
  OrderIntent,
  OrderPreview,
  PlacedOrderResult,
  ProtectiveOcoPlan,
  ProtectiveOcoPlacedResult,
  TradingAccount,
  TradingEnvironment,
} from "./types";
import {
  assertLiveConfirmation,
  assertTradingEnabledForEnvironment,
  assertTradingKillSwitchOff,
  draftsMatchForSubmit,
  isPaperTradingConfigured,
  parseBracketPlan,
  parseOrderDraft,
  parseOrderModifyPatch,
  parseAttachManagementPlaybookRequest,
  parsePreviewPlaybookRequest,
  parseProtectiveOcoPlan,
  PREVIEW_INTENT_MAX_AGE_MS,
  readTradingEnvironmentLock,
  TradingKillSwitchError,
  TradingValidationError,
} from "./validateOrder";
import { validateBracketGeometry } from "./bracketPlan";

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
  private playbookStoreOverride: PlaybookInstanceStore | null;
  private playbookStoreCached: PlaybookInstanceStore | null = null;
  private autoManageStoreOverride: PlaybookAutoManageStore | null;
  private autoManageStoreCached: PlaybookAutoManageStore | null = null;
  private templateStoreOverride: PlaybookTemplateStore | null;
  private templateStoreCached: PlaybookTemplateStore | null = null;

  constructor(
    store?: OrderIntentStore,
    playbookStore?: PlaybookInstanceStore,
    autoManageStore?: PlaybookAutoManageStore,
    templateStore?: PlaybookTemplateStore,
  ) {
    this.storeOverride = store ?? null;
    this.playbookStoreOverride = playbookStore ?? null;
    this.autoManageStoreOverride = autoManageStore ?? null;
    this.templateStoreOverride = templateStore ?? null;
  }

  private async intentStore(): Promise<OrderIntentStore> {
    if (this.storeOverride) return this.storeOverride;
    if (!this.storeCached) {
      this.storeCached = await resolveServerIntentStore();
    }
    return this.storeCached;
  }

  private async playbookStore(): Promise<PlaybookInstanceStore> {
    if (this.playbookStoreOverride) return this.playbookStoreOverride;
    if (!this.playbookStoreCached) {
      this.playbookStoreCached = await resolveServerPlaybookInstanceStore();
    }
    return this.playbookStoreCached;
  }

  private async autoManageStore(): Promise<PlaybookAutoManageStore> {
    if (this.autoManageStoreOverride) return this.autoManageStoreOverride;
    if (!this.autoManageStoreCached) {
      this.autoManageStoreCached = await resolveServerPlaybookAutoManageStore();
    }
    return this.autoManageStoreCached;
  }

  private async templateStore(): Promise<PlaybookTemplateStore> {
    if (this.templateStoreOverride) return this.templateStoreOverride;
    if (!this.templateStoreCached) {
      this.templateStoreCached = await resolveServerPlaybookTemplateStore();
    }
    return this.templateStoreCached;
  }

  private async resolveTemplateForId(
    templateId: string,
    snapshot?: PlaybookTemplate,
  ): Promise<PlaybookTemplate | null> {
    if (snapshot) return snapshot;
    const store = await this.templateStore();
    return resolvePlaybookTemplate(templateId, {
      listUserTemplates: () => store.list(),
    });
  }

  private async syncPlaybookJournal(instance: PlaybookInstance | null | undefined): Promise<void> {
    if (!instance) return;
    try {
      const { ensureDevAppUser } = await import(
        "@/lib/persistence/repositories/appUserRepository"
      );
      const userId = await ensureDevAppUser();
      await syncManagePlaybookToJournal(userId, instance);
    } catch {
      // Journal sync is best-effort when DB/user context is unavailable.
    }
  }

  private async attachManageNotifyAlerts(
    instance: PlaybookInstance,
    template: PlaybookTemplate,
  ): Promise<PlaybookInstance> {
    const { bundleId, alerts } = buildManageNotifyAlertInputs({
      template,
      positionPlan: instance.positionPlan,
    });
    if (alerts.length === 0) {
      return instance;
    }
    try {
      const { ensureDevAppUser } = await import(
        "@/lib/persistence/repositories/appUserRepository"
      );
      const { createAlertDefinition } = await import(
        "@/lib/persistence/repositories/alertRepository"
      );
      const userId = await ensureDevAppUser();
      for (const alertInput of alerts) {
        await createAlertDefinition(userId, alertInput);
      }
      const store = await this.playbookStore();
      return (await store.patch(instance.id, { alertBundleId: bundleId })) ?? instance;
    } catch {
      return instance;
    }
  }

  private async expireManageNotifyAlerts(bundleId: string | undefined): Promise<void> {
    if (!bundleId) return;
    try {
      const { ensureDevAppUser } = await import(
        "@/lib/persistence/repositories/appUserRepository"
      );
      const { expireAlertsForBundleId } = await import(
        "@/lib/persistence/repositories/alertRepository"
      );
      const userId = await ensureDevAppUser();
      await expireAlertsForBundleId(userId, bundleId);
    } catch {
      // Notify cleanup is best-effort when DB/user context is unavailable.
    }
  }

  isTradingEnabled(): boolean {
    return isTradingConfigured();
  }

  private portForEnvironment(environment: TradingEnvironment): BrokerTradingPort {
    const connection = resolveConnectionByEnvironment(environment);
    return createIbTwsTradingAdapter(connection.connectionId);
  }

  async listAccounts(environment?: TradingEnvironment): Promise<TradingAccount[]> {
    const demoFallback = resolveDemoJournalTradingAccount();

    try {
      const lock = readTradingEnvironmentLock();
      const effectiveEnvironment = environment ?? lock ?? undefined;
      if (effectiveEnvironment) {
        this.ensureTradingEnabled(effectiveEnvironment);
      } else {
        assertTradingKillSwitchOff();
        if (!isTradingConfigured()) {
          throw new TradingValidationError("Trading is not configured.");
        }
      }
      await awaitSidecarForBrokerage();
      const client = getBrokerageClient();
      if (!client) {
        throw new BrokerageRequestError("disabled", "Brokerage tracking unavailable.");
      }
      if (!shouldTryBrokerage()) {
        throw new BrokerageRequestError(
          "sidecar_unreachable",
          "Brokerage requests temporarily skipped after repeated failures",
        );
      }
      const live = await probeSidecarLiveness(client.getConfig(), 2_000);
      if (!live) {
        throw new BrokerageRequestError(
          "sidecar_unreachable",
          "TWS sidecar did not respond to /status within 2s.",
        );
      }

      const targets = effectiveEnvironment
        ? [resolveConnectionByEnvironment(effectiveEnvironment)]
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

      return appendDemoJournalAccountIfMissing(accounts);
    } catch (error) {
      if (demoFallback && isListAccountsInfrastructureError(error)) {
        return [demoFallback];
      }
      throw error;
    }
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
    options?: { emergencyExit?: boolean },
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
      if (options?.emergencyExit) {
        this.ensureTradingEnabled(draft.environment, { emergencyExit: true });
      } else {
        await this.assertNewRiskAllowed(draft.environment);
      }
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

  async submitBracket(
    planInput: unknown,
    idempotencyKey: string,
    previewIntentId?: string,
    liveConfirmation?: string,
    playbookAttach?: {
      templateId: string;
      entryPrice: number;
      initialStop: number;
      notifyAtManageLevels?: boolean;
    },
  ): Promise<BracketPlacedResult> {
    const plan = parseBracketPlan(planInput);
    const geometryError = validateBracketGeometry(plan);
    if (geometryError) {
      throw new TradingValidationError(geometryError);
    }
    assertLiveConfirmation(plan.entry.environment, liveConfirmation);

    const store = await this.intentStore();
    const existing = await store.getByIdempotencyKey(idempotencyKey);
    if (existing?.status === "submitted" && existing.orderId != null) {
      const playbookStore = await this.playbookStore();
      const existingPlaybook =
        (await playbookStore.getByOrderIntentId(existing.intentId)) ?? undefined;
      return {
        entryOrder: {
          orderId: existing.orderId,
          permId: existing.permId ?? null,
          account: plan.entry.accountId,
          action: plan.entry.side,
          totalQuantity: plan.entry.quantity,
          orderType: plan.entry.orderType,
          status: "Submitted",
        },
        stopOrder: {
          orderId: existing.stopOrderId ?? null,
          account: plan.entry.accountId,
          status: "Submitted",
        },
        ...(existing.takeProfitOrderId != null
          ? {
              takeProfitOrder: {
                orderId: existing.takeProfitOrderId,
                account: plan.entry.accountId,
                status: "Submitted",
              },
            }
          : {}),
        orderRef: existing.orderRef,
        intent: existing,
        playbookInstance: existingPlaybook,
      };
    }

    try {
      await this.assertNewRiskAllowed(plan.entry.environment);
      if (previewIntentId) {
        await this.validatePreviewIntent(plan.entry, previewIntentId);
      }
      await this.assertPreTrade(plan.entry);
      const port = this.portForEnvironment(plan.entry.environment);

      const intent = await store.createIntent(plan.entry, idempotencyKey);
      const orderRef = intent.orderRef;
      const entryDraft = { ...plan.entry, orderRef };

      const placed = await port.placeBracket({ ...plan, entry: entryDraft }, orderRef);
      const updated =
        (await store.updateIntent(intent.intentId, {
          status: "submitted",
          orderId: placed.entryOrder.orderId ?? null,
          permId: placed.entryOrder.permId ?? null,
          orderRef: placed.orderRef,
          bracketStopPrice: plan.stopLeg.stopPrice ?? null,
          bracketTakeProfitPrice: plan.takeProfitPrice,
          stopOrderId: placed.stopOrder.orderId ?? null,
          takeProfitOrderId: placed.takeProfitOrder?.orderId ?? null,
        })) ?? intent;

      appendAudit({
        action: "submit",
        outcome: "success",
        accountId: plan.entry.accountId,
        intentId: intent.intentId,
        orderRef: placed.orderRef,
        detail: "bracket",
      });

      const attachResult = playbookAttach
        ? await this.attachPlaybookAfterBracket({
            templateId: playbookAttach.templateId,
            entryPrice: playbookAttach.entryPrice,
            initialStop: playbookAttach.initialStop,
            notifyAtManageLevels: playbookAttach.notifyAtManageLevels,
            plan,
            intent: updated,
            orderRef: placed.orderRef,
            stopOrderId: placed.stopOrder.orderId ?? null,
            takeProfitOrderId: placed.takeProfitOrder?.orderId ?? null,
          })
        : {};

      return {
        entryOrder: placed.entryOrder,
        stopOrder: placed.stopOrder,
        takeProfitOrder: placed.takeProfitOrder,
        orderRef: placed.orderRef,
        intent: updated,
        playbookInstance: attachResult.instance,
        playbookAttachError: attachResult.error,
      };
    } catch (error) {
      this.auditBlockedOrFailed("submit", plan.entry.accountId, error);
      throw error;
    }
  }

  async listPlaybookInstances(
    accountId: string,
    options?: { activeOnly?: boolean },
  ): Promise<PlaybookInstance[]> {
    const store = await this.playbookStore();
    return store.listByAccount(accountId, options);
  }

  private async resolveRiskPolicyTemplate(
    templateId: string,
  ): Promise<RiskPolicyTemplate | null> {
    if (templateId === CLASSIC_PROTECT_TEMPLATE_ID) {
      return getClassicProtectTemplate();
    }
    const playbookTemplate = await this.resolveTemplateForId(templateId);
    if (!playbookTemplate) return null;
    return playbookTemplateToRiskPolicyTemplateFull(playbookTemplate);
  }

  async applyRiskPolicyToBinding(input: unknown): Promise<PlaybookInstance> {
    const parsed = ApplyRiskPolicyRequestSchema.parse(input);
    const template = await this.resolveRiskPolicyTemplate(parsed.templateId);
    if (!template) {
      throw new TradingValidationError(`Unknown risk policy template: ${parsed.templateId}`);
    }

    const store = await this.playbookStore();
    const result = await applyRiskPolicy(store, {
      template,
      positionPlan: parsed.positionPlan,
      bindingRef: parsed.bindingRef,
      onConflict: parsed.onConflict ?? "swap",
      entrySchedule: parsed.entrySchedule,
      entryOrder: parsed.entryOrder,
      scheduledFor: parsed.scheduledFor,
    });
    if (!result.ok) {
      throw new TradingValidationError(result.error);
    }
    return result.playbookInstance;
  }

  async syncPlannedInstance(
    instanceId: string,
    input: unknown,
  ): Promise<PlaybookInstance | null> {
    const parsed = SyncPlannedInstanceRequestSchema.parse(input);
    const store = await this.playbookStore();
    const existing = await store.getById(instanceId);
    if (!existing || existing.status !== "planned") {
      throw new TradingValidationError("Planned instance not found");
    }
    return store.patch(instanceId, parsed);
  }

  async clearPlannedBinding(input: unknown): Promise<boolean> {
    const parsed = ClearPlannedBindingRequestSchema.parse(input);
    const store = await this.playbookStore();
    const existing = await store.findPlannedByBinding(parsed.bindingRef);
    if (!existing) return false;
    await store.patch(existing.id, {
      status: "superseded",
      offReason: "manual",
      detachedAt: new Date().toISOString(),
    });
    return true;
  }

  async armPlannedSchedule(
    instanceId: string,
    input: unknown,
  ): Promise<PlaybookInstance | null> {
    const parsed = ArmPlannedScheduleRequestSchema.parse(input);
    const store = await this.playbookStore();
    const existing = await store.getById(instanceId);
    if (!existing || existing.status !== "planned") {
      throw new TradingValidationError("Planned instance not found");
    }
    const scheduledFor =
      parsed.scheduledFor ??
      resolveEntryScheduleFireAt(parsed.entrySchedule, new Date()) ??
      undefined;
    return store.patch(instanceId, {
      entrySchedule: parsed.entrySchedule,
      scheduledFor,
    });
  }

  async promotePlannedInstance(
    instanceId: string,
    input: unknown,
  ): Promise<PlaybookInstance> {
    const parsed = PromotePlannedInstanceRequestSchema.parse(input);
    const store = await this.playbookStore();
    const existing = await store.getById(instanceId);
    if (!existing || existing.status !== "planned") {
      throw new TradingValidationError("Planned instance not found");
    }

    const template = existing.policySnapshot ?? null;
    const gate = evaluateSubmitProtectGate({
      environment: existing.positionPlan.environment,
      template,
      unprotectedConfirm: parsed.unprotectedConfirm,
    });
    if (gate.kind === "hard_block_live") {
      throw new TradingValidationError(
        "Live submit blocked — add a resting Protect policy or confirm unprotected submit",
      );
    }

    assertLiveConfirmation(existing.positionPlan.environment, parsed.liveConfirmation);
    this.ensureTradingEnabled(existing.positionPlan.environment);

    const promoted = await promotePlannedInstanceNow({
      instance: existing,
      playbookStore: store,
      tradingService: {
        submitOrder: async (draftInput, idempotencyKey, previewIntentId, liveConfirmation) => {
          const placed = await this.submitOrder(
            draftInput,
            idempotencyKey,
            previewIntentId,
            liveConfirmation,
          );
          return { orderRef: placed.orderRef, intent: placed.intent };
        },
        submitBracket: async (planInput, idempotencyKey, previewIntentId, liveConfirmation) =>
          this.submitBracket(planInput, idempotencyKey, previewIntentId, liveConfirmation),
      },
      idempotencyKey: parsed.idempotencyKey,
      previewIntentId: parsed.previewIntentId,
      liveConfirmation: parsed.liveConfirmation,
      takeProfitPrice: parsed.takeProfitPrice,
      takeProfitQuantity: parsed.takeProfitQuantity,
      stopQuantity: parsed.stopQuantity,
    });

    await this.syncPlaybookJournal(promoted);
    return promoted;
  }

  async detachPlaybookInstance(instanceId: string): Promise<PlaybookInstance | null> {
    if (detachAffectsProtectOrders()) {
      throw new TradingValidationError("detachAffectsProtectOrders invariant violated");
    }
    const store = await this.playbookStore();
    const existing = await store.getById(instanceId);
    if (!existing) return null;
    if (existing.status === "detached" || existing.status === "completed") {
      return existing;
    }
    await this.expireManageNotifyAlerts(existing.alertBundleId);
    const detached = await store.updateStatus(instanceId, "detached");
    await this.syncPlaybookJournal(detached);
    return detached;
  }

  async pausePlaybookInstance(instanceId: string): Promise<PlaybookInstance | null> {
    if (pauseAffectsProtectOrders()) {
      throw new TradingValidationError("pauseAffectsProtectOrders invariant violated");
    }
    const store = await this.playbookStore();
    const existing = await store.getById(instanceId);
    if (!existing) return null;
    if (existing.status === "detached" || existing.status === "completed") {
      return existing;
    }
    return store.patch(instanceId, { status: "paused" });
  }

  async resumePlaybookInstance(instanceId: string): Promise<PlaybookInstance | null> {
    const store = await this.playbookStore();
    const existing = await store.getById(instanceId);
    if (!existing) return null;
    if (existing.status !== "paused") {
      return existing;
    }
    return store.patch(instanceId, { status: "armed" });
  }

  async skipNextPlaybookRule(instanceId: string): Promise<PlaybookInstance | null> {
    const store = await this.playbookStore();
    const existing = await store.getById(instanceId);
    if (!existing) return null;
    if (existing.status === "detached" || existing.status === "completed") {
      return existing;
    }

    const template = resolvePlaybookTemplateFromInstance(existing);
    if (!template) return existing;

    const sorted = [...template.rules].sort(
      (a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER),
    );
    const nextRule = sorted.find((rule) => {
      const runtime = existing.ruleRuntimes.find((item) => item.ruleId === rule.id);
      return runtime?.status === "pending" || runtime?.status === "armed";
    });
    if (!nextRule) return existing;

    const ruleRuntimes: RuleRuntime[] = existing.ruleRuntimes.map((item) =>
      item.ruleId === nextRule.id
        ? { ...item, status: "skipped", skippedReason: "user_skip" }
        : item,
    );

    return store.patch(instanceId, { ruleRuntimes });
  }

  async cancelProtectForInstance(
    instanceId: string,
    liveConfirmation?: string,
  ): Promise<PlaybookInstance | null> {
    const store = await this.playbookStore();
    const existing = await store.getById(instanceId);
    if (!existing) return null;
    if (existing.status === "detached" || existing.status === "completed") {
      return existing;
    }

    const environment = existing.positionPlan.environment;
    assertLiveConfirmation(environment, liveConfirmation);
    this.ensureTradingEnabled(environment);

    const { getBrokerageService } = await import("@/lib/brokerage/brokerageService");
    const snapshot = await getBrokerageService().getSnapshot(environment);
    const symbol = existing.positionPlan.symbol.trim().toUpperCase();
    const accountId = existing.positionPlan.accountId.trim();
    const closingAction = existing.positionPlan.side === "BUY" ? "SELL" : "BUY";

    const protectiveOrders = snapshot.orders.filter((order) => {
      const orderType = order.orderType?.trim().toUpperCase() ?? "";
      const isProtective =
        orderType.includes("STP") || orderType === "TRAIL" || orderType.includes("TRAIL");
      if (!isProtective) return false;
      if (order.symbol?.trim().toUpperCase() !== symbol) return false;
      if (order.account?.trim() && order.account.trim() !== accountId) return false;
      return order.action?.trim().toUpperCase() === closingAction;
    });

    for (const order of protectiveOrders) {
      if (order.orderId == null) continue;
      await this.cancelOrder(
        accountId,
        order.orderId,
        existing.orderIntentId,
        environment,
        liveConfirmation,
      );
    }

    return store.patch(instanceId, {
      protectState: "cancelled",
      protectCheckedAt: new Date().toISOString(),
      stopOrderId: null,
    });
  }

  async evaluatePlaybooks(): Promise<{
    evaluated: number;
    fired: number;
    skipped: number;
    promoted: number;
    errors: string[];
  }> {
    const autoManage = await this.getPlaybookAutoManageSettings();
    if (!autoManage.paperEnabled && !(autoManage.liveEnabled && autoManage.liveConsentAt)) {
      return { evaluated: 0, fired: 0, skipped: 0, promoted: 0, errors: [] };
    }
    if (autoManage.paperEnabled) {
      this.ensureTradingEnabled("paper");
    }
    if (autoManage.liveEnabled && autoManage.liveConsentAt) {
      this.ensureTradingEnabled("live");
    }

    const playbookStore = await this.playbookStore();
    const intentStore = await this.intentStore();
    const errors: string[] = [];
    let promoted = 0;

    await materializePlannedSchedules({ playbookStore });

    const environments: TradingEnvironment[] = [];
    if (autoManage.paperEnabled) environments.push("paper");
    if (autoManage.liveEnabled && autoManage.liveConsentAt) environments.push("live");

    for (const environment of environments) {
      if (!isAutoManageEnabledForEnvironment(autoManage, environment)) continue;
      const liveConfirmation = resolvePlaybookLiveConfirmation(autoManage, environment);
      const promotion = await promoteDuePlannedInstances({
        playbookStore,
        tradingService: this,
        environments: [environment],
        liveConfirmation,
      });
      promoted += promotion.promoted;
      errors.push(...promotion.errors);
    }

    const evaluation = await runPlaybookEvaluation({
      tradingService: this,
      playbookStore,
      intentStore,
      autoManage,
    });

    return {
      ...evaluation,
      promoted,
      errors: [...errors, ...evaluation.errors],
    };
  }

  async getPlaybookAutoManageSettings(): Promise<PlaybookAutoManageSettings> {
    const store = await this.autoManageStore();
    return store.get();
  }

  async patchPlaybookAutoManageSettings(
    patch: PatchPlaybookAutoManageInput,
  ): Promise<PlaybookAutoManageSettings> {
    const store = await this.autoManageStore();
    return store.patch(patch);
  }

  async listPlaybookTemplates(): Promise<PlaybookTemplate[]> {
    const store = await this.templateStore();
    return store.list();
  }

  async previewPlaybook(input: unknown): Promise<{
    template: Pick<PlaybookTemplate, "id" | "name" | "description"> & { ruleCount: number };
    positionPlan: PositionPlan;
    steps: ManageStep[];
  }> {
    const parsed = parsePreviewPlaybookRequest(input);
    const template = await this.resolveTemplateForId(parsed.templateId);
    if (!template) {
      throw new TradingValidationError(
        `Unknown management playbook template: ${parsed.templateId}`,
      );
    }
    const positionPlan = lockPositionPlan({
      symbol: parsed.symbol,
      accountId: parsed.accountId,
      side: parsed.side,
      entry: parsed.entry,
      initialStop: parsed.initialStop,
      qty: parsed.qty,
      environment: parsed.environment,
    });
    return {
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        ruleCount: template.rules.length,
      },
      positionPlan,
      steps: planPlaybookSteps(template, positionPlan),
    };
  }

  async attachManagementPlaybook(
    input: unknown,
    liveConfirmation?: string,
  ): Promise<PlaybookInstance> {
    const parsed = parseAttachManagementPlaybookRequest(input);
    assertLiveConfirmation(parsed.environment, liveConfirmation ?? parsed.liveConfirmation);
    this.ensureTradingEnabled(parsed.environment);

    const status =
      parsed.status ??
      (parsed.orderIntentId != null && parsed.stopOrderId == null ? "pending_fill" : "armed");
    const orderRef = parsed.orderRef?.trim() || `edge-playbook-${randomUUID()}`;

    const result = await this.attachManagementPlaybookInternal({
      templateId: parsed.templateId,
      entryPrice: parsed.entryPrice,
      initialStop: parsed.initialStop,
      notifyAtManageLevels: parsed.notifyAtManageLevels,
      symbol: parsed.symbol,
      accountId: parsed.accountId,
      side: parsed.side,
      qty: parsed.qty,
      environment: parsed.environment,
      orderRef,
      status,
      orderIntentId: parsed.orderIntentId,
      stopOrderId: parsed.stopOrderId ?? null,
      filledQty: parsed.filledQty ?? null,
    });

    if (result.error) {
      throw new TradingValidationError(result.error);
    }
    if (!result.instance) {
      throw new TradingValidationError("Playbook attach failed");
    }

    appendAudit({
      action: "submit",
      outcome: "success",
      accountId: parsed.accountId,
      orderRef,
      detail: `attach-playbook:${parsed.templateId}`,
    });

    return result.instance;
  }

  async createPlaybookTemplate(
    input: CreatePlaybookTemplateInput,
  ): Promise<PlaybookTemplate> {
    const parsed = CreatePlaybookTemplateSchema.parse(input);
    const store = await this.templateStore();
    return store.create(parsed);
  }

  async patchPlaybookTemplate(
    templateId: string,
    patch: PatchPlaybookTemplateInput,
  ): Promise<PlaybookTemplate | null> {
    const parsed = PatchPlaybookTemplateSchema.parse(patch);
    const store = await this.templateStore();
    return store.patch(templateId, parsed);
  }

  async duplicatePlaybookTemplate(templateId: string): Promise<PlaybookTemplate | null> {
    const store = await this.templateStore();
    return store.duplicate(templateId);
  }

  async deletePlaybookTemplate(templateId: string): Promise<boolean> {
    const store = await this.templateStore();
    return store.delete(templateId);
  }

  private async pausePlaybooksOnManualStopModify(
    accountId: string,
    orderId: number,
    environment: TradingEnvironment,
    patchInput: unknown,
  ): Promise<void> {
    const patch = parseOrderModifyPatch(patchInput);
    if (patch.stopPrice == null) return;

    const store = await this.playbookStore();
    const instances = await store.listActive({ environment });
    for (const instance of instances) {
      if (instance.positionPlan.accountId !== accountId) continue;
      if (instance.stopOrderId !== orderId) continue;
      if (instance.status === "detached" || instance.status === "completed") continue;

      const template = resolvePlaybookTemplateFromInstance(instance);
      if (!template) continue;

      const pausePatch = buildManualStopPausePatch(instance, template.rules);
      if (!pausePatch) continue;
      await store.patch(instance.id, pausePatch);
    }
  }

  private async attachManagementPlaybookInternal(args: {
    templateId: string;
    entryPrice: number;
    initialStop: number;
    symbol: string;
    accountId: string;
    side: BracketPlan["entry"]["side"];
    qty: number;
    environment: BracketPlan["entry"]["environment"];
    orderRef: string;
    status: PlaybookInstance["status"];
    orderIntentId?: string;
    stopOrderId?: number | null;
    filledQty?: number | null;
    notifyAtManageLevels?: boolean;
  }): Promise<{ instance?: PlaybookInstance; error?: string }> {
    const template = await this.resolveTemplateForId(args.templateId);
    if (!template) {
      return { error: `Unknown management playbook template: ${args.templateId}` };
    }

    try {
      const store = await this.playbookStore();
      if (args.orderIntentId) {
        const existing = await store.getByOrderIntentId(args.orderIntentId);
        if (existing) {
          await this.syncPlaybookJournal(existing);
          return { instance: existing };
        }
      } else {
        const existing = (await store.listByAccount(args.accountId)).find(
          (item) =>
            item.orderRef === args.orderRef &&
            (item.status === "pending_fill" ||
              item.status === "armed" ||
              item.status === "paused"),
        );
        if (existing) {
          await this.syncPlaybookJournal(existing);
          return { instance: existing };
        }
      }

      const positionPlan = lockPositionPlan({
        symbol: args.symbol,
        accountId: args.accountId,
        side: args.side,
        entry: args.entryPrice,
        initialStop: args.initialStop,
        qty: args.qty,
        environment: args.environment,
      });
      const manageState = initialManageStateForTemplate(template) ?? undefined;
      const instance = createPlaybookInstance({
        id: createPlaybookInstanceId(),
        template,
        positionPlan,
        status: args.status,
        orderIntentId: args.orderIntentId,
        orderRef: args.orderRef,
        ...(manageState ? { manageState } : {}),
      });
      const created = await store.create(instance);
      let result = created;
      if (args.stopOrderId != null || args.filledQty != null) {
        result =
          (await store.patch(created.id, {
            stopOrderId: args.stopOrderId ?? undefined,
            filledQty: args.filledQty ?? undefined,
            ...(manageState ? { manageState } : {}),
          })) ?? created;
      }
      if (args.notifyAtManageLevels) {
        result = await this.attachManageNotifyAlerts(result, template);
      }
      await this.syncPlaybookJournal(result);
      return { instance: result };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async attachPlaybookAfterBracket(args: {
    templateId: string;
    entryPrice: number;
    initialStop: number;
    notifyAtManageLevels?: boolean;
    plan: BracketPlan;
    intent: OrderIntent;
    orderRef: string;
    stopOrderId?: number | null;
    takeProfitOrderId?: number | null;
  }): Promise<{ instance?: PlaybookInstance; error?: string }> {
    const attach = await this.attachManagementPlaybookInternal({
      templateId: args.templateId,
      entryPrice: args.entryPrice,
      initialStop: args.initialStop,
      notifyAtManageLevels: args.notifyAtManageLevels,
      symbol: args.plan.entry.symbol,
      accountId: args.plan.entry.accountId,
      side: args.plan.entry.side,
      qty: args.plan.entry.quantity,
      environment: args.plan.entry.environment,
      orderRef: args.orderRef,
      status: "pending_fill",
      orderIntentId: args.intent.intentId,
      stopOrderId: args.stopOrderId ?? null,
    });
    if (attach.instance && args.takeProfitOrderId != null) {
      const store = await this.playbookStore();
      const patched =
        (await store.patch(attach.instance.id, {
          takeProfitOrderId: args.takeProfitOrderId,
        })) ?? attach.instance;
      return { instance: patched, error: attach.error };
    }
    return attach;
  }

  async submitProtectiveOco(
    planInput: unknown,
    idempotencyKey: string,
    liveConfirmation?: string,
    playbookAttach?: {
      templateId: string;
      entryPrice: number;
      initialStop: number;
      notifyAtManageLevels?: boolean;
    },
  ): Promise<ProtectiveOcoPlacedResult> {
    const plan = parseProtectiveOcoPlan(planInput);
    assertLiveConfirmation(plan.environment, liveConfirmation);

    try {
      await this.assertNewRiskAllowed(plan.environment);
      const port = this.portForEnvironment(plan.environment);
      const orderRef = plan.orderRef?.trim() || `edge-oco-${randomUUID()}`;
      const placed = await port.placeProtectiveOco({ ...plan, orderRef }, orderRef);

      appendAudit({
        action: "submit",
        outcome: "success",
        accountId: plan.accountId,
        orderRef: placed.orderRef,
        detail: "protective-oco",
      });

      const attachResult = playbookAttach
        ? await this.attachManagementPlaybookInternal({
            templateId: playbookAttach.templateId,
            entryPrice: playbookAttach.entryPrice,
            initialStop: playbookAttach.initialStop,
            notifyAtManageLevels: playbookAttach.notifyAtManageLevels,
            symbol: plan.symbol,
            accountId: plan.accountId,
            side: plan.side === "SELL" ? "BUY" : "SELL",
            qty: plan.quantity,
            environment: plan.environment,
            orderRef: placed.orderRef,
            status: "armed",
            stopOrderId: placed.stopOrder.orderId ?? null,
            filledQty: plan.quantity,
          })
        : {};

      return {
        stopOrder: placed.stopOrder,
        takeProfitOrder: placed.takeProfitOrder,
        orderRef: placed.orderRef,
        playbookInstance: attachResult.instance,
        playbookAttachError: attachResult.error,
      };
    } catch (error) {
      this.auditBlockedOrFailed("submit", plan.accountId, error);
      throw error;
    }
  }

  async listActivePlaybookInstances(options?: {
    environment?: TradingEnvironment;
  }): Promise<PlaybookInstance[]> {
    const store = await this.playbookStore();
    return store.listActive(options);
  }

  async exitAndCleanup(args: {
    instanceId: string;
    liveConfirmation?: string;
    reason?: string;
  }): Promise<{
    instance: PlaybookInstance;
    cancelledOrderIds: number[];
    flattened: boolean;
  }> {
    const store = await this.playbookStore();
    const existing = await store.getById(args.instanceId);
    if (!existing) {
      throw new TradingValidationError(`Playbook instance ${args.instanceId} not found`);
    }

    const environment = existing.positionPlan.environment;
    assertLiveConfirmation(environment, args.liveConfirmation);
    this.ensureTradingEnabled(environment, { emergencyExit: true });

    if (
      existing.status === "closed" ||
      existing.status === "completed" ||
      existing.status === "detached"
    ) {
      return { instance: existing, cancelledOrderIds: [], flattened: false };
    }

    let instance =
      (await store.patch(existing.id, {
        controlMode: "paused",
        offReason: "exit_cleanup",
      })) ?? existing;

    const { getBrokerageService } = await import("@/lib/brokerage/brokerageService");
    let snapshot = await getBrokerageService().getSnapshot(environment);
    const autoManage = await this.getPlaybookAutoManageSettings();
    const liveConfirmation =
      resolvePlaybookLiveConfirmation(autoManage, environment) ?? args.liveConfirmation;

    const correlated = ordersCorrelatedWithInstance(instance, snapshot.orders);
    const cancelledOrderIds: number[] = [];
    for (const order of correlated) {
      if (order.orderId == null) continue;
      try {
        await this.cancelOrder(
          instance.positionPlan.accountId,
          order.orderId,
          instance.orderIntentId,
          environment,
          liveConfirmation,
          { emergencyExit: true },
        );
        cancelledOrderIds.push(order.orderId);
      } catch {
        // Best-effort cancel before flatten.
      }
    }

    let flattened = false;
    let qty = positionQtyForInstance(instance, snapshot);
    if (Math.abs(qty) > 0) {
      const draft = buildFlattenDraftForInstance(instance, snapshot);
      if (draft) {
        const idempotencyKey = `exit-cleanup-${instance.id}-${Date.now()}`;
        await this.submitOrder(draft, idempotencyKey, undefined, liveConfirmation, {
          emergencyExit: true,
        });
        flattened = true;
        snapshot = await getBrokerageService().getSnapshot(environment);
        qty = positionQtyForInstance(instance, snapshot);
      }
    }

    instance =
      (await store.patch(instance.id, {
        status: "closed",
        closedAt: new Date().toISOString(),
        controlMode: "off",
        offReason: args.reason ?? "exit_cleanup",
        stopOrderId: null,
        takeProfitOrderId: null,
        protectState: "cancelled",
      })) ?? instance;

    await this.syncPlaybookJournal(instance);

    appendAudit({
      action: "submit",
      outcome: "success",
      accountId: instance.positionPlan.accountId,
      intentId: instance.orderIntentId,
      orderRef: instance.orderRef,
      detail: `exitAndCleanup:${instance.id}:cancelled=${cancelledOrderIds.length}:flat=${flattened}:qty=${qty}`,
    });

    return { instance, cancelledOrderIds, flattened };
  }

  async killAndFlattenEnvironment(args: {
    environment: TradingEnvironment;
    liveConfirmation?: string;
  }): Promise<{ flattened: number; errors: string[] }> {
    assertLiveConfirmation(args.environment, args.liveConfirmation);
    this.ensureTradingEnabled(args.environment, { emergencyExit: true });

    const autoStore = await this.autoManageStore();
    await autoStore.patch(
      args.environment === "paper"
        ? { paperKillActive: true }
        : { liveKillActive: true, liveConfirmation: args.liveConfirmation },
    );

    const playbookStore = await this.playbookStore();
    const instances = await playbookStore.listActive({ environment: args.environment });
    const errors: string[] = [];
    let flattened = 0;

    for (const instance of instances) {
      try {
        await this.exitAndCleanup({
          instanceId: instance.id,
          liveConfirmation: args.liveConfirmation,
          reason: "env_kill",
        });
        flattened += 1;
      } catch (error) {
        errors.push(
          `${instance.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    appendAudit({
      action: "submit",
      outcome: errors.length === 0 ? "success" : "failed",
      accountId: instances[0]?.positionPlan.accountId ?? "unknown",
      detail: `killAndFlatten:${args.environment}:instances=${flattened}:errors=${errors.length}`,
    });

    return { flattened, errors };
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
      await this.pausePlaybooksOnManualStopModify(accountId, orderId, environment, patchInput);
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
    options?: { emergencyExit?: boolean },
  ): Promise<{ order: PlacedOrderResult["order"]; intent: OrderIntent | null }> {
    try {
      assertLiveConfirmation(environment, liveConfirmation);
      this.ensureTradingEnabled(environment, options);
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

  private ensureTradingEnabled(
    environment: TradingEnvironment = "paper",
    options?: { emergencyExit?: boolean },
  ): void {
    assertTradingEnabledForEnvironment(environment);
    if (!options?.emergencyExit) {
      assertTradingKillSwitchOff();
    }
  }

  private async assertNewRiskAllowed(environment: TradingEnvironment): Promise<void> {
    this.ensureTradingEnabled(environment);
    const settings = await this.getPlaybookAutoManageSettings();
    if (isEnvironmentKillActive(settings, environment)) {
      throw new TradingValidationError(
        `Trading kill is active for ${environment}. New entries blocked.`,
      );
    }
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
    const riskSettings = await resolveServerRiskSettings();
    const [status, summary, positionsResult, pnl] = await Promise.all([
      client.getStatus(),
      client.getSummary(),
      client.getPositions(),
      client.getPnL(),
    ]);

    const accountUpdatedAt = Math.max(
      summary.updatedAt ?? 0,
      status.summaryUpdatedAt ?? 0,
    );
    const readiness = evaluateTradingReadiness({
      brokerageConnected: status.connected,
      accountSummary: summary,
      accountUpdatedAt,
      riskSettings,
      now: preTradeFetchedAt,
    });

    if (!readiness.ok) {
      throw new TradingReadinessBlockedError(readiness.reasons);
    }

    assertCoveredSell(draft, positionsResult.positions);

    if (isRiskIncreasingEntry(draft, positionsResult.positions)) {
      const openPositionCount = positionsResult.positions.filter(
        (row) => (row.position ?? 0) !== 0,
      ).length;
      const playbookStore = await this.playbookStore();
      const instances = await playbookStore.listByAccount(draft.accountId, {
        activeOnly: true,
      });
      const proposedRiskDollars = resolveDollarRisk(riskSettings, summary);
      const gateInput = buildAccountGateEvaluationInput({
        settings: riskSettings,
        accountSummary: summary,
        pnl,
        playbookInstances: instances,
        openPositionCount,
        proposedRiskDollars,
      });
      const gateStatus = evaluateAccountRiskGates(gateInput);
      const gateReasons = accountGateBlockReasons(gateStatus, {
        proposedRiskDollars,
      });
      if (gateReasons.length > 0) {
        throw new TradingReadinessBlockedError(gateReasons);
      }
    }

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
  resetServerPlaybookInstanceStoreForTests();
  resetServerPlaybookAutoManageStoreForTests();
  resetServerPlaybookTemplateStoreForTests();
}

export { isTradingConfigured, isPaperTradingConfigured };
