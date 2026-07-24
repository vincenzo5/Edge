import "server-only";

import { findTradeForOrderRef, EDGE_INTENT_ORDER_REF_PREFIX } from "@/lib/journal/correlateOrderRef";
import {
  listJournalFills,
  listJournalTrades,
  patchJournalTradeManagePlaybook,
} from "@/lib/persistence/repositories/journalRepository";
import type { ManagePlaybookJournal } from "@/lib/persistence/schemas/journal";

import { isManageActionableThen } from "./evaluateWhen";
import { resolvePlaybookTemplateFromInstance } from "./resolveTemplate";
import { resolvePlaybookPresetName } from "./display";
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

  return {
    templateId: instance.templateId,
    templateName: template?.name ?? resolvePlaybookPresetName(instance.templateId),
    instanceId: instance.id,
    ruleTimeline: instance.ruleRuntimes,
    plannedRuleCount,
    firedRuleCount,
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

  await patchJournalTradeManagePlaybook(userId, trade.id, buildManagePlaybookJournal(instance));
}
