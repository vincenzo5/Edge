import "server-only";

import { getBrokerageService } from "@/lib/brokerage/brokerageService";
import type { BrokerageSnapshot } from "@/lib/brokerage/brokerageService";
import { getServerMarketDataService } from "@/lib/marketData/service/server";
import type { AccountOrder, AccountPosition } from "@/lib/marketData/contracts/brokerage";
import { resolveConnectionByEnvironment } from "@/lib/trading/connectionRegistry";
import type { TradingService } from "../tradingService";
import type { PlaybookInstanceStore } from "@/lib/trading/playbookInstanceStore";
import type { OrderIntentStore } from "@/lib/trading/intentStore";
import {
  isAutoManageEnabledForEnvironment,
  resolvePlaybookLiveConfirmation,
  type PlaybookAutoManageSettings,
} from "@/lib/trading/playbookAutoManageStore";
import type { TradingEnvironment } from "../types";

import type { PlaybookMutationPort } from "./executeThen";
import { executePlaybookThen } from "./executeThen";
import {
  evaluatePlaybookWhen,
  isActionableWhenKind,
  isManageActionableThen,
  resolveEntryOrderId,
  ruleRequirementsMet,
} from "./evaluateWhen";
import { resolvePlaybookTemplateFromInstance } from "./resolveTemplate";
import { syncManagePlaybookToJournal } from "./journalRecipe";
import { resolveEffectiveFilledQty, resolveReduceQtyFromFilled } from "./reduceQty";
import { resolveProtectiveStopOrderId } from "./resolveStopOrder";
import type { PlaybookInstance, PlaybookRule, RuleRuntime } from "./types";

export type PlaybookEvaluationResult = {
  evaluated: number;
  fired: number;
  skipped: number;
  errors: string[];
};

const TERMINAL_RULE_STATUSES = new Set(["fired", "skipped", "cancelled"]);

function findPosition(
  snapshot: BrokerageSnapshot,
  instance: PlaybookInstance,
): AccountPosition | null {
  const symbol = instance.positionPlan.symbol;
  const accountId = instance.positionPlan.accountId;
  return (
    snapshot.positions.find(
      (row) =>
        row.contract.symbol?.trim().toUpperCase() === symbol &&
        (!row.account || row.account === accountId) &&
        (row.position ?? 0) !== 0,
    ) ?? null
  );
}

async function resolveQuotePrice(
  symbol: string,
  environment: PlaybookInstance["positionPlan"]["environment"],
): Promise<number | null> {
  const connection = resolveConnectionByEnvironment(environment);
  const quoteResult = await getServerMarketDataService().getQuotes([symbol], {
    twsConnectionId: connection.connectionId,
    respectProviderPreference: false,
    trustUsage: "trading_decision",
  });
  const quote = quoteResult.data.find(
    (row) => row.symbol.trim().toUpperCase() === symbol.trim().toUpperCase(),
  );
  return quote?.price ?? null;
}

function markRuleRuntime(
  runtimes: RuleRuntime[],
  ruleId: string,
  patch: Partial<RuleRuntime>,
): RuleRuntime[] {
  return runtimes.map((item) =>
    item.ruleId === ruleId
      ? {
          ...item,
          ...patch,
        }
      : item,
  );
}

function sortedRules(rules: PlaybookRule[]): PlaybookRule[] {
  return [...rules].sort(
    (a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER),
  );
}

function instanceIsComplete(instance: PlaybookInstance, rules: PlaybookRule[]): boolean {
  return rules.every((rule) => {
    const runtime = instance.ruleRuntimes.find((item) => item.ruleId === rule.id);
    if (!runtime) return false;
    if (!isManageActionableThen(rule.then)) {
      return runtime.status === "skipped" || runtime.status === "cancelled";
    }
    return TERMINAL_RULE_STATUSES.has(runtime.status);
  });
}

async function resolveIntentStopOrderId(
  intentStore: OrderIntentStore,
  orderIntentId: string | undefined,
): Promise<number | null> {
  if (!orderIntentId) return null;
  const intent = await intentStore.getById(orderIntentId);
  return intent?.stopOrderId ?? null;
}

async function evaluateSingleInstance(args: {
  instance: PlaybookInstance;
  tradingService: PlaybookMutationPort;
  playbookStore: PlaybookInstanceStore;
  intentStore: OrderIntentStore;
  snapshot: BrokerageSnapshot;
  autoManage: PlaybookAutoManageSettings;
}): Promise<{ fired: number; skipped: number; errors: string[] }> {
  const { tradingService, playbookStore, intentStore, autoManage } = args;
  let instance = args.instance;
  const errors: string[] = [];
  let fired = 0;
  let skipped = 0;

  if (instance.status === "paused" || instance.status === "detached") {
    return { fired, skipped, errors };
  }

  const environment = instance.positionPlan.environment;
  if (!isAutoManageEnabledForEnvironment(autoManage, environment)) {
    return { fired, skipped, errors };
  }

  const liveConfirmation = resolvePlaybookLiveConfirmation(autoManage, environment);

  const template = resolvePlaybookTemplateFromInstance(instance);
  if (!template) {
    errors.push(`Unknown template ${instance.templateId} for ${instance.id}`);
    return { fired, skipped, errors };
  }

  const position = findPosition(args.snapshot, instance);
  const positionQty = position?.position ?? null;
  let filledQty = resolveEffectiveFilledQty(
    instance.positionPlan,
    instance.filledQty,
    positionQty,
  );

  if (instance.status === "pending_fill") {
    if (positionQty == null || positionQty === 0) {
      return { fired, skipped, errors };
    }
    instance =
      (await playbookStore.patch(instance.id, {
        status: "armed",
        filledQty,
      })) ?? instance;
  }

  const lastPrice = await resolveQuotePrice(instance.positionPlan.symbol, environment);
  if (lastPrice == null) {
    errors.push(`No quote for ${instance.positionPlan.symbol} (${instance.id})`);
    return { fired, skipped, errors };
  }

  const entryOrderId = resolveEntryOrderId(args.snapshot.orders, instance);
  const intentStopOrderId = await resolveIntentStopOrderId(intentStore, instance.orderIntentId);
  let stopOrderId = resolveProtectiveStopOrderId({
    instance,
    orders: args.snapshot.orders,
    entryOrderId,
    intentStopOrderId,
  });

  if (stopOrderId != null && stopOrderId !== instance.stopOrderId) {
    instance = (await playbookStore.patch(instance.id, { stopOrderId })) ?? instance;
  }

  const rules = sortedRules(template.rules);

  for (const rule of rules) {
    const runtime = instance.ruleRuntimes.find((item) => item.ruleId === rule.id);
    if (!runtime || TERMINAL_RULE_STATUSES.has(runtime.status)) {
      continue;
    }

    if (!isManageActionableThen(rule.then)) {
      instance =
        (await playbookStore.patch(instance.id, {
          ruleRuntimes: markRuleRuntime(instance.ruleRuntimes, rule.id, {
            status: "skipped",
            skippedReason: "deferred_phase",
          }),
        })) ?? instance;
      skipped += 1;
      continue;
    }

    if (!isActionableWhenKind(rule.when)) {
      instance =
        (await playbookStore.patch(instance.id, {
          ruleRuntimes: markRuleRuntime(instance.ruleRuntimes, rule.id, {
            status: "skipped",
            skippedReason: "deferred_when",
          }),
        })) ?? instance;
      skipped += 1;
      continue;
    }

    if (!ruleRequirementsMet(rule, instance.ruleRuntimes)) {
      continue;
    }

    const whenSatisfied = evaluatePlaybookWhen(rule.when, instance.positionPlan, {
      lastPrice,
      ruleRuntimes: instance.ruleRuntimes,
    });
    if (!whenSatisfied) {
      continue;
    }

    const result = await executePlaybookThen(rule, {
      tradingService,
      instance,
      stopOrderId,
      filledQty,
      liveConfirmation,
    });

    if (result.ok) {
      fired += 1;
      if (result.stopOrderId != null) {
        stopOrderId = result.stopOrderId;
      }
      instance =
        (await playbookStore.patch(instance.id, {
          ruleRuntimes: markRuleRuntime(instance.ruleRuntimes, rule.id, {
            status: "fired",
            firedAt: new Date().toISOString(),
          }),
          ...(stopOrderId != null ? { stopOrderId } : {}),
        })) ?? instance;
      await syncPlaybookJournalInstance(instance);

      if (rule.then.kind === "reduceQty") {
        const qty = resolveReduceQtyFromFilled(rule.then, filledQty);
        if (qty != null) {
          filledQty = Math.max(0, filledQty - qty);
          instance = (await playbookStore.patch(instance.id, { filledQty })) ?? instance;
        }
      }
      continue;
    }

    if (result.skippedReason) {
      instance =
        (await playbookStore.patch(instance.id, {
          ruleRuntimes: markRuleRuntime(instance.ruleRuntimes, rule.id, {
            status: "skipped",
            skippedReason: result.skippedReason,
          }),
        })) ?? instance;
      skipped += 1;
      continue;
    }

    errors.push(`${instance.id}/${rule.id}: ${result.error}`);
  }

  if (instanceIsComplete({ ...instance, ruleRuntimes: instance.ruleRuntimes }, rules)) {
    instance = (await playbookStore.patch(instance.id, { status: "completed" })) ?? instance;
    await syncPlaybookJournalInstance(instance);
  }

  return { fired, skipped, errors };
}

async function syncPlaybookJournalInstance(instance: PlaybookInstance): Promise<void> {
  try {
    const { ensureDevAppUser } = await import(
      "@/lib/persistence/repositories/appUserRepository"
    );
    const userId = await ensureDevAppUser();
    await syncManagePlaybookToJournal(userId, instance);
  } catch {
    // Best-effort journal sync during evaluation.
  }
}

function resolveEvaluationEnvironments(
  autoManage: PlaybookAutoManageSettings,
): TradingEnvironment[] {
  const environments: TradingEnvironment[] = [];
  if (autoManage.paperEnabled) environments.push("paper");
  if (autoManage.liveEnabled && autoManage.liveConsentAt) environments.push("live");
  return environments;
}

export async function runPlaybookEvaluation(args: {
  tradingService: PlaybookMutationPort;
  playbookStore: PlaybookInstanceStore;
  intentStore: OrderIntentStore;
  autoManage: PlaybookAutoManageSettings;
}): Promise<PlaybookEvaluationResult> {
  const environments = resolveEvaluationEnvironments(args.autoManage);
  if (environments.length === 0) {
    return { evaluated: 0, fired: 0, skipped: 0, errors: [] };
  }

  const errors: string[] = [];
  let fired = 0;
  let skipped = 0;
  let evaluated = 0;

  const snapshotCache = new Map<TradingEnvironment, BrokerageSnapshot>();

  for (const environment of environments) {
    const instances = await args.playbookStore.listActive({ environment });
    evaluated += instances.length;

    let snapshot = snapshotCache.get(environment);
    if (!snapshot) {
      try {
        snapshot = await getBrokerageService().getSnapshot(environment);
      } catch (error) {
        errors.push(
          `snapshot:${environment}: ${error instanceof Error ? error.message : String(error)}`,
        );
        continue;
      }
      snapshotCache.set(environment, snapshot);
    }

    for (const instance of instances) {
      const result = await evaluateSingleInstance({
        instance,
        tradingService: args.tradingService,
        playbookStore: args.playbookStore,
        intentStore: args.intentStore,
        snapshot,
        autoManage: args.autoManage,
      });
      fired += result.fired;
      skipped += result.skipped;
      errors.push(...result.errors);
    }
  }

  return {
    evaluated,
    fired,
    skipped,
    errors,
  };
}
