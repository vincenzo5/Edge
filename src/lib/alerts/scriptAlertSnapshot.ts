import {
  isTruthyScriptSignal,
  type Candle,
  type ScriptManifest,
} from "@edge/chart-core";
import type { AlertDefinitionResponse, AlertScriptCondition } from "@/lib/persistence/schemas/alerts";
import { normalizeAlertConditions } from "@/lib/alerts/alertConditions";
import { postAlertSnapshot } from "@/lib/alerts/alertClient";

export type ScriptConditionSnapshot = {
  satisfied: boolean;
  barTime: number;
};

export function extractScriptConditionSnapshot(input: {
  manifest: ScriptManifest;
  conditionId: string;
  series: Record<string, Array<number | null>>;
  candles: Candle[];
}): ScriptConditionSnapshot | null {
  const alertDef = input.manifest.alerts?.[input.conditionId];
  if (!alertDef) return null;
  const values = input.series[alertDef.seriesId];
  if (!values?.length || !input.candles.length) return null;
  const lastIdx = Math.min(values.length, input.candles.length) - 1;
  const value = values[lastIdx];
  const barTime = input.candles[lastIdx]?.t;
  if (barTime == null || !Number.isFinite(barTime)) return null;
  return {
    satisfied: isTruthyScriptSignal(value ?? null),
    barTime,
  };
}

export function listScriptConditionsForAlert(
  alert: AlertDefinitionResponse,
): AlertScriptCondition[] {
  return normalizeAlertConditions(alert).filter(
    (condition): condition is AlertScriptCondition => condition.kind === "script_condition",
  );
}

export function alertMatchesScriptCondition(
  alert: AlertDefinitionResponse,
  match: Pick<AlertScriptCondition, "scriptId" | "revision" | "conditionId">,
): boolean {
  if (alert.status !== "active") return false;
  return listScriptConditionsForAlert(alert).some(
    (condition) =>
      condition.scriptId === match.scriptId &&
      condition.revision === match.revision &&
      condition.conditionId === match.conditionId,
  );
}

type SnapshotCacheKey = string;

function snapshotCacheKey(alertId: string, symbol: string, barTime: number, satisfied: boolean): SnapshotCacheKey {
  return `${alertId}|${symbol}|${barTime}|${satisfied}`;
}

const lastPostedSnapshot = new Map<SnapshotCacheKey, number>();

export async function publishScriptAlertSnapshots(input: {
  symbol: string;
  scriptId: string;
  revision: string;
  manifest: ScriptManifest;
  series: Record<string, Array<number | null>>;
  candles: Candle[];
  alerts: AlertDefinitionResponse[];
}): Promise<void> {
  const symbol = input.symbol.trim().toUpperCase();
  if (!symbol || symbol === "*") return;
  if (!input.manifest.alerts || Object.keys(input.manifest.alerts).length === 0) return;

  const relevantAlerts = input.alerts.filter((alert) =>
    alert.symbol === symbol || alert.symbol === "*",
  );

  for (const [conditionId] of Object.entries(input.manifest.alerts)) {
    const snapshot = extractScriptConditionSnapshot({
      manifest: input.manifest,
      conditionId,
      series: input.series,
      candles: input.candles,
    });
    if (!snapshot) continue;

    for (const alert of relevantAlerts) {
      if (
        !alertMatchesScriptCondition(alert, {
          scriptId: input.scriptId,
          revision: input.revision,
          conditionId,
        })
      ) {
        continue;
      }

      const cacheKey = snapshotCacheKey(
        alert.id,
        symbol,
        snapshot.barTime,
        snapshot.satisfied,
      );
      if (lastPostedSnapshot.get(cacheKey) === snapshot.barTime) continue;
      lastPostedSnapshot.set(cacheKey, snapshot.barTime);

      try {
        await postAlertSnapshot(alert.id, {
          symbol,
          satisfied: snapshot.satisfied,
          barTime: snapshot.barTime,
        });
      } catch {
        lastPostedSnapshot.delete(cacheKey);
      }
    }
  }
}

export function resetScriptAlertSnapshotCacheForTests(): void {
  lastPostedSnapshot.clear();
}
