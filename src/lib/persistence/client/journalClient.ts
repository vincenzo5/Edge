import type {
  JournalChartSnapshotCreate,
  JournalChartSnapshotPatch,
  JournalChartSnapshotResponse,
  JournalFillAccountIndexEntry,
  JournalFillResponse,
  JournalScreenshotPatch,
  JournalScreenshotResponse,
  JournalTradePatch,
  JournalTradeResponse,
} from "@/lib/persistence/schemas/journal";
import type { JournalFill, JournalImportResult, JournalTrade } from "@/lib/journal/types";
import type { JournalFillInput } from "@/lib/persistence/schemas/journal";
import type { JournalScreenshotSource } from "@/lib/journal/types";
import {
  addLocalJournalTradeChartSnapshot,
  deleteLocalJournalTradeChartSnapshot,
  getLocalJournalTradeChartSnapshot,
  listLocalJournalTradeChartSnapshots,
  patchLocalJournalTradeChartSnapshot,
} from "@/lib/journal/localChartSnapshotStore";
import {
  addLocalJournalTradeScreenshot,
  deleteLocalJournalTradeScreenshot,
  getLocalJournalTradeScreenshot,
  listLocalJournalTradeScreenshots,
  patchLocalJournalTradeScreenshot,
} from "@/lib/journal/localScreenshotStore";
import { persistenceFetch } from "@/lib/persistence/client/persistenceFetch";
import {
  patchLocalJournalTrade,
  readLocalJournalSnapshot,
  replaceLocalJournalTrades,
  upsertLocalJournalFills,
} from "@/lib/journal/localJournalStore";
import { adoptServerJournalTrades } from "@/lib/journal/adoptServerJournalTrades";
import {
  collectFillExecIds,
  fillAccountIndexToMap,
  mergeJournalProviderTrades,
} from "@/lib/journal/journalProviderLoad";
import { JOURNAL_PROVIDER_TRADE_LIMIT } from "@/lib/journal/journalProviderConstants";
import { rebuildTrades } from "@/lib/journal/rebuildTrades";
import { computePlannedRiskUsd } from "@/lib/journal/rMultiple";
import { getOrFetchClientTtl } from "@/lib/marketData/cache/getOrFetchClientTtl";
import {
  buildJournalTradesCacheKey,
  invalidateJournalPersistenceCache,
  JOURNAL_FILLS_CACHE_KEY,
} from "@/lib/persistence/client/persistenceClientCache";

export { invalidateJournalPersistenceCache };

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

type PersistenceErrorResponse = {
  error?: unknown;
  details?: {
    fieldErrors?: Record<string, unknown>;
    formErrors?: unknown;
  };
};

function firstErrorText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = firstErrorText(item);
      if (text) return text;
    }
  }
  return null;
}

async function persistenceResponseError(
  response: Response,
  fallback: string,
): Promise<Error> {
  const body = await parseJsonResponse<PersistenceErrorResponse>(response);
  const message =
    typeof body?.error === "string" && body.error.trim() ? body.error.trim() : fallback;
  const fieldErrors = body?.details?.fieldErrors;
  if (fieldErrors) {
    for (const [field, value] of Object.entries(fieldErrors)) {
      const detail = firstErrorText(value);
      if (detail) return new Error(`${message}: ${field}: ${detail}`);
    }
  }
  const formDetail = firstErrorText(body?.details?.formErrors);
  return new Error(formDetail ? `${message}: ${formDetail}` : message);
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
  limit?: number;
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
  if (query.limit != null) {
    trades = trades.slice(0, query.limit);
  }
  return trades;
}

function fetchLocalJournalFillAccountIndex(execIds: string[]): JournalFillAccountIndexEntry[] {
  if (execIds.length === 0) return [];
  const wanted = new Set(execIds);
  return readLocalJournalSnapshot()
    .fills.filter((fill) => wanted.has(fill.execId))
    .map((fill) => ({
      execId: fill.execId,
      account: fill.account?.trim() ?? null,
    }));
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

let syncJournalStoresInFlight: Promise<"online" | "offline"> | null = null;

function buildJournalTradesQuery(
  query: {
    status?: "open" | "closed" | "all";
    symbol?: string;
    secType?: string;
    tag?: string;
    from?: string;
    to?: string;
    limit?: number;
  } = {},
): string {
  const params = new URLSearchParams();
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.symbol) params.set("symbol", query.symbol);
  if (query.secType) params.set("secType", query.secType);
  if (query.tag) params.set("tag", query.tag);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.limit != null) params.set("limit", String(query.limit));
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

async function syncJournalStores(): Promise<"online" | "offline"> {
  if (syncJournalStoresInFlight) {
    return syncJournalStoresInFlight;
  }

  syncJournalStoresInFlight = (async () => {
    try {
      const response = await persistenceFetch("/api/me/journal/fills", { method: "GET" });
      if (response.status === 503 || !response.ok) {
        rebuildLocalJournalTrades();
        return "offline";
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

      return "online";
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
  from?: string;
  to?: string;
  limit?: number;
} = {}): Promise<JournalTradeResponse[]> {
  const mode = await syncJournalStores();
  if (mode === "offline") {
    return fetchLocalJournalTrades(query);
  }

  const cacheKey = buildJournalTradesCacheKey(query);
  return getOrFetchClientTtl("journal_trades", cacheKey, async () => {
    const response = await persistenceFetch(
      `/api/me/journal/trades${buildJournalTradesQuery(query)}`,
      { method: "GET" },
    );
    if (response.status === 503 || !response.ok) {
      if (response.status === 503) {
        rebuildLocalJournalTrades();
        return fetchLocalJournalTrades(query);
      }
      throw await persistenceResponseError(response, "Journal trades fetch failed.");
    }

    const body = await parseJsonResponse<{ trades: JournalTradeResponse[] }>(response);
    const serverTrades = body?.trades ?? [];
    const previousLocalTrades = readLocalJournalSnapshot().trades;
    return adoptServerJournalTrades(serverTrades, previousLocalTrades);
  });
}

export async function fetchJournalTradeById(
  tradeId: string,
): Promise<JournalTradeResponse | null> {
  await syncJournalStores();
  const response = await persistenceFetch(`/api/me/journal/trades/${tradeId}`, {
    method: "GET",
  });

  if (response.status === 404) return null;

  if (response.status === 503 || !response.ok) {
    const local = readLocalJournalSnapshot().trades.find((trade) => trade.id === tradeId);
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
      rating: local.rating ?? null,
      mfeUsd: local.mfeUsd ?? null,
      mfaUsd: local.mfaUsd ?? null,
      excursionInterval: local.excursionInterval ?? null,
      excursionComputedAt: local.excursionComputedAt ?? null,
      createdAt: local.createdAt ?? now,
      updatedAt: local.updatedAt ?? now,
    };
  }

  return parseJsonResponse<JournalTradeResponse>(response);
}

export async function fetchJournalProviderTrades(): Promise<JournalTradeResponse[]> {
  const [openTrades, closedTrades] = await Promise.all([
    fetchJournalTrades({ status: "open", limit: JOURNAL_PROVIDER_TRADE_LIMIT }),
    fetchJournalTrades({ status: "closed", limit: JOURNAL_PROVIDER_TRADE_LIMIT }),
  ]);
  return mergeJournalProviderTrades(openTrades, closedTrades);
}

export async function fetchJournalFillAccountIndex(
  execIds: string[],
): Promise<ReadonlyMap<string, string | null>> {
  const uniqueExecIds = [...new Set(execIds.map((execId) => execId.trim()).filter(Boolean))];
  if (uniqueExecIds.length === 0) {
    return new Map();
  }

  const mode = await syncJournalStores();
  if (mode === "offline") {
    return fillAccountIndexToMap(fetchLocalJournalFillAccountIndex(uniqueExecIds));
  }

  const response = await persistenceFetch("/api/me/journal/fills/account-index", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ execIds: uniqueExecIds }),
  });

  if (response.status === 503 || !response.ok) {
    return fillAccountIndexToMap(fetchLocalJournalFillAccountIndex(uniqueExecIds));
  }

  const body = await parseJsonResponse<{ entries: JournalFillAccountIndexEntry[] }>(response);
  return fillAccountIndexToMap(body?.entries ?? []);
}

export async function fetchJournalFills(): Promise<JournalFillResponse[]> {
  await syncJournalStores();
  return getOrFetchClientTtl("journal_fills", JOURNAL_FILLS_CACHE_KEY, async () => {
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
  });
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
    invalidateJournalPersistenceCache();
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
      invalidateJournalPersistenceCache();
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
      initialStop: patch.initialStop,
      rating: patch.rating as JournalTrade["rating"],
      ignored: patch.ignored,
      mfeUsd: patch.mfeUsd,
      mfaUsd: patch.mfaUsd,
      excursionInterval: patch.excursionInterval as JournalTrade["excursionInterval"],
      excursionComputedAt: patch.excursionComputedAt ?? undefined,
    });
    if (!local) return null;
    const now = new Date().toISOString();
    const plannedRiskUsd =
      local.plannedRiskUsd ??
      computePlannedRiskUsd(local, local.plannedRiskMode ?? null, local.plannedRiskValue ?? null);
    return {
      ...local,
      closedAt: local.closedAt ?? null,
      tags: local.tags ?? [],
      setup: local.setup ?? null,
      reviewNote: local.reviewNote ?? null,
      plannedRiskMode: local.plannedRiskMode ?? null,
      plannedRiskValue: local.plannedRiskValue ?? null,
      plannedRiskUsd,
      initialStop: local.initialStop ?? null,
      rating: local.rating ?? null,
      ignored: local.ignored ?? false,
      mfeUsd: local.mfeUsd ?? null,
      mfaUsd: local.mfaUsd ?? null,
      excursionInterval: local.excursionInterval ?? null,
      excursionComputedAt: local.excursionComputedAt ?? null,
      createdAt: local.createdAt ?? now,
      updatedAt: local.updatedAt ?? now,
    };
  }

  if (!response.ok) return null;
  const patched = await parseJsonResponse<JournalTradeResponse>(response);
  if (patched) invalidateJournalPersistenceCache();
  return patched;
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
  const result = await parseJsonResponse<JournalImportResult>(response);
  if (result) invalidateJournalPersistenceCache();
  return result;
}

export function journalTradeScreenshotImageUrl(tradeId: string, screenshotId: string): string {
  return `/api/me/journal/trades/${tradeId}/screenshots/${screenshotId}`;
}

/** In-memory blobs from the just-uploaded file so previews never depend on a racey refetch. */
const screenshotPreviewBlobCache = new Map<string, Blob>();

export function cacheJournalTradeScreenshotBlob(screenshotId: string, blob: Blob): void {
  screenshotPreviewBlobCache.set(screenshotId, blob);
}

export function clearCachedJournalTradeScreenshotBlob(screenshotId: string): void {
  screenshotPreviewBlobCache.delete(screenshotId);
}

export async function fetchJournalTradeScreenshots(
  tradeId: string,
): Promise<JournalScreenshotResponse[]> {
  const response = await persistenceFetch(`/api/me/journal/trades/${tradeId}/screenshots`, {
    method: "GET",
  });
  if (response.status === 503 || !response.ok) {
    const local = await listLocalJournalTradeScreenshots(tradeId);
    return local.map(({ blob: _blob, ...meta }) => meta);
  }
  const body = await parseJsonResponse<{ screenshots: JournalScreenshotResponse[] }>(response);
  return body?.screenshots ?? [];
}

export async function uploadJournalTradeScreenshot(
  tradeId: string,
  file: Blob,
  options: {
    source?: JournalScreenshotSource;
    caption?: string | null;
    filename?: string;
  } = {},
): Promise<JournalScreenshotResponse | null> {
  const form = new FormData();
  const filename = options.filename ?? "screenshot.png";
  form.append("file", file, filename);
  form.append("source", options.source ?? "upload");
  if (options.caption) form.append("caption", options.caption);

  const response = await persistenceFetch(`/api/me/journal/trades/${tradeId}/screenshots`, {
    method: "POST",
    body: form,
  });

  if (response.status === 503) {
    const local = await addLocalJournalTradeScreenshot(tradeId, {
      file,
      mimeType: file.type || "image/png",
      source: options.source ?? "upload",
      caption: options.caption,
    });
    cacheJournalTradeScreenshotBlob(local.id, file);
    return local;
  }

  if (!response.ok) {
    throw await persistenceResponseError(response, "Screenshot upload failed.");
  }
  const result = await parseJsonResponse<JournalScreenshotResponse>(response);
  if (!result) throw new Error("Screenshot upload returned an invalid response.");
  cacheJournalTradeScreenshotBlob(result.id, file);
  return result;
}

export async function patchJournalTradeScreenshotRemote(
  tradeId: string,
  screenshotId: string,
  patch: JournalScreenshotPatch,
): Promise<JournalScreenshotResponse | null> {
  const response = await persistenceFetch(
    `/api/me/journal/trades/${tradeId}/screenshots/${screenshotId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );

  if (response.status === 503) {
    return patchLocalJournalTradeScreenshot(tradeId, screenshotId, patch);
  }

  if (!response.ok) return null;
  return parseJsonResponse<JournalScreenshotResponse>(response);
}

export async function deleteJournalTradeScreenshotRemote(
  tradeId: string,
  screenshotId: string,
): Promise<boolean> {
  const response = await persistenceFetch(
    `/api/me/journal/trades/${tradeId}/screenshots/${screenshotId}`,
    { method: "DELETE" },
  );

  if (response.status === 503) {
    const deleted = await deleteLocalJournalTradeScreenshot(tradeId, screenshotId);
    if (deleted) clearCachedJournalTradeScreenshotBlob(screenshotId);
    return deleted;
  }

  if (!response.ok) return false;
  const body = await parseJsonResponse<{ ok: boolean }>(response);
  const ok = body?.ok === true;
  if (ok) clearCachedJournalTradeScreenshotBlob(screenshotId);
  return ok;
}

export async function resolveJournalTradeScreenshotBlobUrl(
  tradeId: string,
  screenshotId: string,
): Promise<string | null> {
  const cached = screenshotPreviewBlobCache.get(screenshotId);
  if (cached) {
    return URL.createObjectURL(cached);
  }

  const local = await getLocalJournalTradeScreenshot(screenshotId);
  if (local && local.tradeId === tradeId) {
    return URL.createObjectURL(local.blob);
  }

  const response = await persistenceFetch(
    journalTradeScreenshotImageUrl(tradeId, screenshotId),
    { method: "GET" },
  );
  if (!response.ok) return null;
  const blob = await response.blob();
  if (!blob.type.startsWith("image/") || blob.size <= 0) return null;
  return URL.createObjectURL(blob);
}

export async function fetchJournalTradeChartSnapshots(
  tradeId: string,
): Promise<JournalChartSnapshotResponse[]> {
  const response = await persistenceFetch(`/api/me/journal/trades/${tradeId}/chart-snapshots`, {
    method: "GET",
  });
  if (response.status === 503 || !response.ok) {
    const local = await listLocalJournalTradeChartSnapshots(tradeId);
    return local.map(({ cellConfigOriginal: _original, ...meta }) => meta);
  }
  const body = await parseJsonResponse<{ snapshots: JournalChartSnapshotResponse[] }>(response);
  return body?.snapshots ?? [];
}

export async function createJournalTradeChartSnapshotRemote(
  tradeId: string,
  input: JournalChartSnapshotCreate,
): Promise<JournalChartSnapshotResponse | null> {
  const response = await persistenceFetch(`/api/me/journal/trades/${tradeId}/chart-snapshots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (response.status === 503) {
    return addLocalJournalTradeChartSnapshot(tradeId, input);
  }

  if (!response.ok) {
    throw await persistenceResponseError(response, "Chart snapshot create failed.");
  }
  const result = await parseJsonResponse<JournalChartSnapshotResponse>(response);
  if (!result) throw new Error("Chart snapshot create returned an invalid response.");
  return result;
}

export async function patchJournalTradeChartSnapshotRemote(
  tradeId: string,
  snapshotId: string,
  patch: JournalChartSnapshotPatch,
): Promise<JournalChartSnapshotResponse | null> {
  const response = await persistenceFetch(
    `/api/me/journal/trades/${tradeId}/chart-snapshots/${snapshotId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );

  if (response.status === 503) {
    return patchLocalJournalTradeChartSnapshot(tradeId, snapshotId, patch);
  }

  if (!response.ok) return null;
  return parseJsonResponse<JournalChartSnapshotResponse>(response);
}

export async function deleteJournalTradeChartSnapshotRemote(
  tradeId: string,
  snapshotId: string,
): Promise<boolean> {
  const response = await persistenceFetch(
    `/api/me/journal/trades/${tradeId}/chart-snapshots/${snapshotId}`,
    { method: "DELETE" },
  );

  if (response.status === 503) {
    return deleteLocalJournalTradeChartSnapshot(tradeId, snapshotId);
  }

  if (!response.ok) return false;
  const body = await parseJsonResponse<{ ok: boolean }>(response);
  return body?.ok === true;
}

export async function getJournalTradeChartSnapshotRemote(
  tradeId: string,
  snapshotId: string,
): Promise<JournalChartSnapshotResponse | null> {
  const response = await persistenceFetch(
    `/api/me/journal/trades/${tradeId}/chart-snapshots/${snapshotId}`,
    { method: "GET" },
  );

  if (response.status === 503 || !response.ok) {
    const local = await getLocalJournalTradeChartSnapshot(snapshotId);
    if (!local || local.tradeId !== tradeId) return null;
    const { cellConfigOriginal: _original, ...meta } = local;
    return meta;
  }

  return parseJsonResponse<JournalChartSnapshotResponse>(response);
}
