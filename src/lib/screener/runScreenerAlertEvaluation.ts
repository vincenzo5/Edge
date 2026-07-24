import "server-only";

import type { SavedScreen } from "@/lib/screener/types";
import { isSavedMoversScreen, isSavedScreenerScreen } from "@/lib/screener/types";
import { getServerMarketDataService } from "@/lib/marketData/service/server";
import { buildWorkspaceDeepLink } from "@/lib/appWorkspace/deepLinks";
import { emitNotification } from "@/lib/notifications/emitNotification";
import {
  computeNextRunAt,
  listDueScreenerAlerts,
  updateScreenerAlertById,
} from "@/lib/persistence/repositories/screenerAlertRepository";
import { getScreenerLibrary } from "@/lib/persistence/repositories/screenerLibraryRepository";
import {
  diffAddedSymbols,
  formatAddedSymbolsBody,
  isScreenerAlertInCooldown,
  normalizeSymbolSet,
} from "@/lib/screener/screenerAlertDiff";

export type ScreenerAlertEvaluationResult = {
  evaluated: number;
  notified: number;
  skippedStale: number;
};

async function runScreenSymbols(
  userId: string,
  screen: SavedScreen,
): Promise<{ symbols: string[]; stale: boolean }> {
  const service = getServerMarketDataService();

  if (isSavedMoversScreen(screen)) {
    const result = await service.getFmpMarketMovers({
      kind: screen.moverKind,
      limit: screen.limit ?? 50,
    });
    return {
      symbols: result.data.map((row) => row.symbol),
      stale: result.stale,
    };
  }

  if (isSavedScreenerScreen(screen)) {
    const result = await service.getScreenerResults(screen.query);
    return {
      symbols: result.data.map((row) => row.symbol),
      stale: result.stale,
    };
  }

  return { symbols: [], stale: false };
}

export async function runScreenerAlertEvaluation(): Promise<ScreenerAlertEvaluationResult> {
  const dueAlerts = await listDueScreenerAlerts();
  if (dueAlerts.length === 0) {
    return { evaluated: 0, notified: 0, skippedStale: 0 };
  }

  let notified = 0;
  let skippedStale = 0;
  const now = new Date();
  const nowMs = now.getTime();
  const firedAt = now.toISOString();

  for (const alert of dueAlerts) {
    const library = await getScreenerLibrary(alert.userId);
    const screen = library?.screenerSnapshot.savedScreens.find(
      (entry) => entry.id === alert.screenId,
    );

    if (!screen) {
      await updateScreenerAlertById(alert.id, {
        lastRunAt: firedAt,
        nextRunAt: computeNextRunAt(alert.intervalMinutes, now).toISOString(),
      });
      continue;
    }

    const run = await runScreenSymbols(alert.userId, screen);
    const nextRunAt = computeNextRunAt(alert.intervalMinutes, now).toISOString();

    if (run.stale) {
      skippedStale += 1;
      await updateScreenerAlertById(alert.id, {
        lastRunAt: firedAt,
        nextRunAt,
      });
      continue;
    }

    const nextSymbols = normalizeSymbolSet(run.symbols);
    const added = diffAddedSymbols(alert.lastSymbols, nextSymbols);
    const hasBaseline = alert.lastSymbols.length > 0;
    const shouldNotify =
      hasBaseline &&
      added.length > 0 &&
      !isScreenerAlertInCooldown(alert.lastFiredAt, alert.cooldownMs, nowMs);

    if (shouldNotify) {
      await emitNotification({
        userId: alert.userId,
        source: "screener",
        title: `${screen.name}: ${added.length} new match${added.length === 1 ? "" : "es"}`,
        body: formatAddedSymbolsBody(added),
        href: buildWorkspaceDeepLink({ surface: "screener" }),
        dedupeKey: `screener-alert:${alert.id}:${Math.floor(nowMs / alert.cooldownMs)}`,
      });
      notified += 1;
      await updateScreenerAlertById(alert.id, {
        lastSymbols: nextSymbols,
        lastRunAt: firedAt,
        nextRunAt,
        lastFiredAt: firedAt,
      });
      continue;
    }

    await updateScreenerAlertById(alert.id, {
      lastSymbols: nextSymbols,
      lastRunAt: firedAt,
      nextRunAt,
    });
  }

  return { evaluated: dueAlerts.length, notified, skippedStale };
}
