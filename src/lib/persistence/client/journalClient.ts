import type {
  JournalFillResponse,
  JournalTradePatch,
  JournalTradeResponse,
} from "@/lib/persistence/schemas/journal";
import type { JournalFill, JournalImportResult, JournalTrade } from "@/lib/journal/types";
import type { JournalFillInput } from "@/lib/persistence/schemas/journal";
import { persistenceFetch } from "@/lib/persistence/client/persistenceFetch";
import {
  patchLocalJournalTrade,
  readLocalJournalSnapshot,
  replaceLocalJournalTrades,
  upsertLocalJournalFills,
} from "@/lib/journal/localJournalStore";
import { rebuildTrades } from "@/lib/journal/rebuildTrades";
import { computePlannedRiskUsd } from "@/lib/journal/rMultiple";

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function toLocalFillResponses(fills: JournalFill[]): JournalFillResponse[] {
  return fills.map((fill, index) => ({
    ...fill,
    id: fill.id ?? `local-fill-${index}-${fill.execId}`,
    createdAt: fill.createdAt ?? fill.fillTime,
  }));
}

function toLocalTradeResponses(trades: ReturnType<typeof rebuildTrades>["trades"]): JournalTradeResponse[] {
  const now = new Date().toISOString();
  return trades.map((trade) => ({
    ...trade,
    closedAt: trade.closedAt ?? null,
    tags: trade.tags ?? [],
    setup: trade.setup ?? null,
    reviewNote: trade.reviewNote ?? null,
    createdAt: trade.createdAt ?? now,
    updatedAt: trade.updatedAt ?? now,
  }));
}

function fetchLocalJournalTrades(query: {
  status?: "open" | "closed" | "all";
  symbol?: string;
  secType?: string;
  tag?: string;
} = {}): JournalTradeResponse[] {
  let trades = toLocalTradeResponses(readLocalJournalSnapshot().trades);
  if (query.status && query.status !== "all") {
    trades = trades.filter((trade) => trade.status === query.status);
  }
  if (query.symbol) {
    const symbol = query.symbol.toUpperCase();
    trades = trades.filter((trade) => trade.symbol === symbol);
  }
  if (query.secType) {
    const secType = query.secType.toUpperCase();
    trades = trades.filter((trade) => trade.secType === secType);
  }
  if (query.tag) {
    trades = trades.filter((trade) => (trade.tags ?? []).includes(query.tag!));
  }
  return trades;
}

function mirrorJournalFillsLocally(
  fills: JournalFillInput[],
  rebuildTradesFlag = true,
): { fills: JournalFillResponse[]; tradesRebuilt: number } {
  const snapshot = upsertLocalJournalFills(fills);
  if (!rebuildTradesFlag) {
    return {
      fills: toLocalFillResponses(snapshot.fills),
      tradesRebuilt: snapshot.trades.length,
    };
  }
  const { trades } = rebuildTrades(snapshot.fills, snapshot.trades);
  replaceLocalJournalTrades(trades);
  return {
    fills: toLocalFillResponses(snapshot.fills),
    tradesRebuilt: trades.length,
  };
}

function rebuildLocalJournalTrades(): void {
  const snapshot = readLocalJournalSnapshot();
  const { trades } = rebuildTrades(snapshot.fills, snapshot.trades);
  replaceLocalJournalTrades(trades);
}

let syncJournalStoresInFlight: Promise<void> | null = null;

async function syncJournalStores(): Promise<void> {
  if (syncJournalStoresInFlight) {
    return syncJournalStoresInFlight;
  }

  syncJournalStoresInFlight = (async () => {
    try {
      const response = await persistenceFetch("/api/me/journal/fills", { method: "GET" });
      if (response.status === 503 || !response.ok) {
        rebuildLocalJournalTrades();
        return;
      }

      const body = await parseJsonResponse<{ fills: JournalFillResponse[] }>(response);
      const remoteFills = body?.fills ?? [];
      if (remoteFills.length > 0) {
        mirrorJournalFillsLocally(remoteFills, true);
      }

      const local = readLocalJournalSnapshot();
      if (local.fills.length > 0) {
        const remoteExecIds = new Set(remoteFills.map((fill) => fill.execId));
        const missing = local.fills.filter((fill) => !remoteExecIds.has(fill.execId));
        if (missing.length > 0) {
          const pushResponse = await persistenceFetch("/api/me/journal/fills", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fills: missing, rebuildTrades: true }),
          });
          if (pushResponse.status !== 503 && pushResponse.ok) {
            await parseJsonResponse(pushResponse);
          }
        }
      }

      rebuildLocalJournalTrades();
    } finally {
      syncJournalStoresInFlight = null;
    }
  })();

  return syncJournalStoresInFlight;
}

export async function fetchJournalTrades(query: {
  status?: "open" | "closed" | "all";
  symbol?: string;
  secType?: string;
  tag?: string;
} = {}): Promise<JournalTradeResponse[]> {
  await syncJournalStores();
  return fetchLocalJournalTrades(query);
}

export async function fetchJournalFills(): Promise<JournalFillResponse[]> {
  await syncJournalStores();
  const response = await persistenceFetch("/api/me/journal/fills", { method: "GET" });
  if (response.status === 503 || !response.ok) {
    return toLocalFillResponses(readLocalJournalSnapshot().fills);
  }
  const body = await parseJsonResponse<{ fills: JournalFillResponse[] }>(response);
  const remoteFills = body?.fills ?? [];
  if (remoteFills.length > 0) {
    mirrorJournalFillsLocally(
      remoteFills.map((fill) => ({
        execId: fill.execId,
        fillTime: fill.fillTime,
        side: fill.side,
        quantity: fill.quantity,
        price: fill.price,
        contract: fill.contract,
        source: fill.source,
      })),
      false,
    );
  }
  return toLocalFillResponses(readLocalJournalSnapshot().fills);
}

export async function upsertJournalFillsRemote(
  fills: JournalFillInput[],
  rebuildTradesFlag = true,
): Promise<(JournalImportResult & { fills: JournalFillResponse[] }) | null> {
  const response = await persistenceFetch("/api/me/journal/fills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fills, rebuildTrades: rebuildTradesFlag }),
  });

  if (response.status === 503) {
    const mirrored = mirrorJournalFillsLocally(fills, rebuildTradesFlag);
    return {
      fills: mirrored.fills,
      imported: fills.length,
      duplicates: 0,
      skipped: 0,
      tradesRebuilt: mirrored.tradesRebuilt,
    };
  }

  if (!response.ok) return null;
  const result = await parseJsonResponse<JournalImportResult & { fills: JournalFillResponse[] }>(
    response,
  );
  if (result) {
    mirrorJournalFillsLocally(fills, rebuildTradesFlag);
  }
  return result;
}

export async function importJournalCsvRemote(
  csvText: string,
): Promise<(JournalImportResult & { fills: JournalFillResponse[]; errors?: string[] }) | null> {
  const form = new FormData();
  form.append("file", new Blob([csvText], { type: "text/csv" }), "flex-trades.csv");
  const response = await persistenceFetch("/api/me/journal/import", {
    method: "POST",
    body: form,
  });

  if (response.status === 503) {
    const { parseFlexCsv } = await import("@/lib/journal/flexImport/parseFlexCsv");
    const parsed = parseFlexCsv(csvText);
    if (parsed.errors.length > 0) {
      return {
        fills: [],
        imported: 0,
        duplicates: 0,
        skipped: parsed.skipped,
        tradesRebuilt: 0,
        errors: parsed.errors,
      };
    }
    return upsertJournalFillsRemote(parsed.fills, true);
  }

  if (!response.ok) return null;
  const result = await parseJsonResponse<
    JournalImportResult & { fills: JournalFillResponse[]; errors?: string[] }
  >(response);
  if (result && (result.errors?.length ?? 0) === 0) {
    const { parseFlexCsv } = await import("@/lib/journal/flexImport/parseFlexCsv");
    const parsed = parseFlexCsv(csvText);
    if (parsed.errors.length === 0) {
      mirrorJournalFillsLocally(parsed.fills, true);
      await syncJournalStores();
    }
  }
  return result;
}

export async function patchJournalTradeRemote(
  tradeId: string,
  patch: JournalTradePatch,
): Promise<JournalTradeResponse | null> {
  const response = await persistenceFetch(`/api/me/journal/trades/${tradeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (response.status === 503) {
    const local = patchLocalJournalTrade(tradeId, {
      tags: patch.tags,
      setup: patch.setup as JournalTrade["setup"],
      reviewNote: patch.reviewNote,
      plannedRiskMode: patch.plannedRiskMode as JournalTrade["plannedRiskMode"],
      plannedRiskValue: patch.plannedRiskValue,
    });
    if (!local) return null;
    const now = new Date().toISOString();
    const plannedRiskUsd = computePlannedRiskUsd(
      local,
      local.plannedRiskMode ?? null,
      local.plannedRiskValue ?? null,
    );
    return {
      ...local,
      closedAt: local.closedAt ?? null,
      tags: local.tags ?? [],
      setup: local.setup ?? null,
      reviewNote: local.reviewNote ?? null,
      plannedRiskMode: local.plannedRiskMode ?? null,
      plannedRiskValue: local.plannedRiskValue ?? null,
      plannedRiskUsd,
      createdAt: local.createdAt ?? now,
      updatedAt: local.updatedAt ?? now,
    };
  }

  if (!response.ok) return null;
  return parseJsonResponse<JournalTradeResponse>(response);
}

export async function rebuildJournalTradesRemote(): Promise<JournalImportResult | null> {
  const response = await persistenceFetch("/api/me/journal/trades/rebuild", {
    method: "POST",
  });
  if (response.status === 503) {
    const snapshot = readLocalJournalSnapshot();
    const { trades } = rebuildTrades(snapshot.fills, snapshot.trades);
    replaceLocalJournalTrades(trades);
    return {
      imported: 0,
      skipped: 0,
      duplicates: 0,
      tradesRebuilt: trades.length,
    };
  }
  if (!response.ok) return null;
  return parseJsonResponse<JournalImportResult>(response);
}
