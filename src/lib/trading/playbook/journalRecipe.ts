import "server-only";

import { findTradeForOrderRef, EDGE_INTENT_ORDER_REF_PREFIX } from "@/lib/journal/correlateOrderRef";
import {
  listJournalFills,
  listJournalTrades,
  patchJournalTrade,
  patchJournalTradeManagePlaybook,
} from "@/lib/persistence/repositories/journalRepository";
import type { ManagePlaybookJournal } from "@/lib/persistence/schemas/journal";

import { isManageActionableThen } from "./evaluateWhen";
import { resolvePlaybookTemplateFromInstance } from "./resolveTemplate";
import { resolvePlaybookPresetName } from "./display";
import {
  buildPositionPlanJournalSnapshot,
  derivePlannedRiskFromPositionPlan,
  formatProtectSummaryFromPositionPlan,
  tradePlannedRiskIsEmpty,
} from "./journalRiskHandoff";
import type { PlaybookInstance } from "./types";

export function buildManagePlaybookJournal(
  instance: PlaybookInstance,
): ManagePlaybookJournal {
  const template = resolvePlaybookTemplateFromInstance(instance);
  const plannedRuleCount =
    template?.rules.filter((rule) => isManageActionableThen(rule.then)).length ??
    instance.ruleRuntimes.length;
  const firedRuleCount = instance.ruleRuntimes.filter(
    (item) => item.status === "fired",
  ).length;
  const positionPlan = buildPositionPlanJournalSnapshot(instance.positionPlan);

  return {
    templateId: instance.templateId,
    templateName: template?.name ?? resolvePlaybookPresetName(instance.templateId),
    instanceId: instance.id,
    ruleTimeline: instance.ruleRuntimes,
    plannedRuleCount,
    firedRuleCount,
    positionPlan,
    protectSummary: formatProtectSummaryFromPositionPlan(instance.positionPlan),
  };
}

function resolveInstanceOrderRef(instance: PlaybookInstance): string | null {
  const direct = instance.orderRef?.trim();
  if (direct) return direct;
  const intentId = instance.orderIntentId?.trim();
  if (!intentId) return null;
  return `${EDGE_INTENT_ORDER_REF_PREFIX}${intentId}`;
}

export async function syncManagePlaybookToJournal(
  userId: string,
  instance: PlaybookInstance,
): Promise<void> {
  const orderRef = resolveInstanceOrderRef(instance);
  if (!orderRef) return;

  const [fills, trades] = await Promise.all([
    listJournalFills(userId),
    listJournalTrades(userId, { limit: 5000 }),
  ]);
  const trade = findTradeForOrderRef(fills, trades, orderRef);
  if (!trade) return;

  if (
    tradePlannedRiskIsEmpty(
      trade as {
        plannedRiskMode?: string | null;
        plannedRiskValue?: number | null;
      },
    )
  ) {
    const derived = derivePlannedRiskFromPositionPlan(instance.positionPlan);
    if (derived) {
      await patchJournalTrade(userId, trade.id, {
        plannedRiskMode: derived.mode,
        plannedRiskValue: derived.value,
      });
    }
  }

  await patchJournalTradeManagePlaybook(userId, trade.id, buildManagePlaybookJournal(instance));
}
