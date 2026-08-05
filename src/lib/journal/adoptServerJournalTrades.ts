import type { JournalSetup, JournalTrade, JournalTradeRating } from "@/lib/journal/types";
import { JOURNAL_RATING_VALUES } from "@/lib/journal/types";
import type {
  JournalTradePatch,
  JournalTradeResponse,
} from "@/lib/persistence/schemas/journal";
import { migrateLocalJournalTradeChartSnapshots } from "@/lib/journal/localChartSnapshotStore";
import { migrateLocalJournalTradeScreenshots } from "@/lib/journal/localScreenshotStore";
import { replaceLocalJournalTrades } from "@/lib/journal/localJournalStore";
import { tradeExecIdsKey } from "@/lib/journal/tradeExecIdsKey";
import { persistenceFetch } from "@/lib/persistence/client/persistenceFetch";

function buildLocalTradeMap(trades: JournalTrade[]): Map<string, JournalTrade> {
  const map = new Map<string, JournalTrade>();
  for (const trade of trades) {
    const key = tradeExecIdsKey(trade.fillExecIds);
    if (!key) continue;
    map.set(key, trade);
  }
  return map;
}

function serverReviewFieldsEmpty(trade: JournalTradeResponse): boolean {
  return (
    (trade.tags?.length ?? 0) === 0 &&
    (trade.setup ?? null) == null &&
    (trade.reviewNote?.trim() ?? "") === "" &&
    (trade.plannedRiskMode ?? null) == null &&
    (trade.plannedRiskValue ?? null) == null &&
    (trade.rating ?? null) == null &&
    !(trade.ignored ?? false) &&
    (trade.mfeUsd ?? null) == null &&
    (trade.mfaUsd ?? null) == null
  );
}

function localReviewFieldsPresent(local: JournalTrade): boolean {
  return (
    (local.tags?.length ?? 0) > 0 ||
    (local.setup ?? null) != null ||
    (local.reviewNote?.trim() ?? "") !== "" ||
    (local.plannedRiskMode ?? null) != null ||
    (local.plannedRiskValue ?? null) != null ||
    (local.rating ?? null) != null ||
    local.ignored === true ||
    (local.mfeUsd ?? null) != null ||
    (local.mfaUsd ?? null) != null
  );
}

function buildMetadataPatch(
  server: JournalTradeResponse,
  local: JournalTrade,
): JournalTradePatch | null {
  const patch: JournalTradePatch = {};

  if ((server.tags?.length ?? 0) === 0 && (local.tags?.length ?? 0) > 0) {
    patch.tags = local.tags;
  }
  if ((server.setup ?? null) == null && (local.setup ?? null) != null) {
    patch.setup = local.setup;
  }
  if ((server.reviewNote?.trim() ?? "") === "" && (local.reviewNote?.trim() ?? "") !== "") {
    patch.reviewNote = local.reviewNote ?? null;
  }
  if ((server.plannedRiskMode ?? null) == null && (local.plannedRiskMode ?? null) != null) {
    patch.plannedRiskMode = local.plannedRiskMode;
  }
  if ((server.plannedRiskValue ?? null) == null && (local.plannedRiskValue ?? null) != null) {
    patch.plannedRiskValue = local.plannedRiskValue;
  }
  if ((server.rating ?? null) == null && (local.rating ?? null) != null) {
    patch.rating = local.rating;
  }
  if (!(server.ignored ?? false) && local.ignored === true) {
    patch.ignored = true;
  }
  if ((server.mfeUsd ?? null) == null && (local.mfeUsd ?? null) != null) {
    patch.mfeUsd = local.mfeUsd;
  }
  if ((server.mfaUsd ?? null) == null && (local.mfaUsd ?? null) != null) {
    patch.mfaUsd = local.mfaUsd;
  }
  if ((server.excursionInterval ?? null) == null && (local.excursionInterval ?? null) != null) {
    patch.excursionInterval = local.excursionInterval;
  }
  if (
    (server.excursionComputedAt ?? null) == null &&
    (local.excursionComputedAt ?? null) != null
  ) {
    patch.excursionComputedAt = local.excursionComputedAt;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

function parseJournalSetup(value: string | null | undefined): JournalSetup | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseJournalRating(value: number | null | undefined): JournalTradeRating | null {
  if (value == null) return null;
  return (JOURNAL_RATING_VALUES as readonly number[]).includes(value)
    ? (value as JournalTradeRating)
    : null;
}

function toLocalJournalTrade(trade: JournalTradeResponse): JournalTrade {
  return {
    id: trade.id,
    status: trade.status,
    direction: trade.direction,
    symbol: trade.symbol,
    secType: trade.secType,
    openedAt: trade.openedAt,
    closedAt: trade.closedAt ?? null,
    netQuantity: trade.netQuantity ?? null,
    avgEntry: trade.avgEntry ?? null,
    avgExit: trade.avgExit ?? null,
    grossPnL: trade.grossPnL ?? null,
    netPnL: trade.netPnL ?? null,
    totalCommission: trade.totalCommission ?? null,
    legs: trade.legs,
    fillExecIds: trade.fillExecIds,
    tags: trade.tags ?? [],
    setup: parseJournalSetup(trade.setup),
    reviewNote: trade.reviewNote ?? null,
    plannedRiskMode: trade.plannedRiskMode ?? null,
    plannedRiskValue: trade.plannedRiskValue ?? null,
    plannedRiskUsd: trade.plannedRiskUsd ?? null,
    rating: parseJournalRating(trade.rating),
    ignored: trade.ignored ?? false,
    mfeUsd: trade.mfeUsd ?? null,
    mfaUsd: trade.mfaUsd ?? null,
    excursionInterval: trade.excursionInterval ?? null,
    excursionComputedAt: trade.excursionComputedAt ?? null,
    createdAt: trade.createdAt,
    updatedAt: trade.updatedAt,
  };
}

async function patchServerTradeMetadata(
  tradeId: string,
  patch: JournalTradePatch,
): Promise<JournalTradeResponse | null> {
  const response = await persistenceFetch(`/api/me/journal/trades/${tradeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return null;
  try {
    return (await response.json()) as JournalTradeResponse;
  } catch {
    return null;
  }
}

export async function adoptServerJournalTrades(
  serverTrades: JournalTradeResponse[],
  previousLocalTrades: JournalTrade[],
): Promise<JournalTradeResponse[]> {
  const localByKey = buildLocalTradeMap(previousLocalTrades);
  const adopted: JournalTradeResponse[] = [];

  for (const serverTrade of serverTrades) {
    const key = tradeExecIdsKey(serverTrade.fillExecIds);
    const localTrade = key ? localByKey.get(key) : undefined;

    let nextTrade = serverTrade;

    if (localTrade && localTrade.id !== serverTrade.id) {
      await migrateLocalJournalTradeScreenshots(localTrade.id, serverTrade.id);
      await migrateLocalJournalTradeChartSnapshots(localTrade.id, serverTrade.id);
    }

    if (
      localTrade &&
      serverReviewFieldsEmpty(serverTrade) &&
      localReviewFieldsPresent(localTrade)
    ) {
      const patch = buildMetadataPatch(serverTrade, localTrade);
      if (patch) {
        const patched = await patchServerTradeMetadata(serverTrade.id, patch);
        nextTrade = patched ?? {
          ...serverTrade,
          tags: patch.tags ?? serverTrade.tags ?? [],
          setup: patch.setup !== undefined ? patch.setup : serverTrade.setup ?? null,
          reviewNote:
            patch.reviewNote !== undefined ? patch.reviewNote : serverTrade.reviewNote ?? null,
          plannedRiskMode:
            patch.plannedRiskMode !== undefined
              ? patch.plannedRiskMode
              : serverTrade.plannedRiskMode ?? null,
          plannedRiskValue:
            patch.plannedRiskValue !== undefined
              ? patch.plannedRiskValue
              : serverTrade.plannedRiskValue ?? null,
          rating:
            patch.rating !== undefined ? patch.rating : serverTrade.rating ?? null,
          ignored:
            patch.ignored !== undefined ? patch.ignored : serverTrade.ignored ?? false,
          mfeUsd: patch.mfeUsd !== undefined ? patch.mfeUsd : serverTrade.mfeUsd ?? null,
          mfaUsd: patch.mfaUsd !== undefined ? patch.mfaUsd : serverTrade.mfaUsd ?? null,
          excursionInterval:
            patch.excursionInterval !== undefined
              ? patch.excursionInterval
              : serverTrade.excursionInterval ?? null,
          excursionComputedAt:
            patch.excursionComputedAt !== undefined
              ? patch.excursionComputedAt
              : serverTrade.excursionComputedAt ?? null,
        };
      }
    }

    adopted.push(nextTrade);
  }

  replaceLocalJournalTrades(adopted.map(toLocalJournalTrade));
  return adopted;
}
