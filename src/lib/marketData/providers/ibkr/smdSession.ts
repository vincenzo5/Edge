import WebSocket from "ws";
import type { EquityQuote } from "../../contracts/equities";
import type { IbkrClient } from "./client";
import { getIbkrWebSocketUrl } from "./client";
import { createContractResolver } from "./contractResolver";

export type SmdQuoteUpdate = {
  symbol: string;
  conid: number;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
};

export type IbkrSmdSession = {
  subscribe(symbols: string[]): Promise<void>;
  unsubscribe(symbols: string[]): void;
  onUpdate(handler: (updates: SmdQuoteUpdate[]) => void): () => void;
  close(): void;
  isConnected(): boolean;
};

const QUOTE_FIELDS = ["31", "82", "83", "87", "87_raw"];

function parseField(row: Record<string, unknown>, field: string): number | null {
  const raw = row[field];
  if (raw == null) return null;
  if (typeof raw === "string") {
    const cleaned = raw
      .replace(/^[A-Z]/, "")
      .replace(/^[+]/, "")
      .replace(/,/g, "")
      .trim();
    if (cleaned === "" || cleaned === "-") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  return null;
}

function mapSmdPayload(
  symbol: string,
  conid: number,
  payload: Record<string, unknown>,
): SmdQuoteUpdate {
  return {
    symbol,
    conid,
    price: parseField(payload, "31"),
    change: parseField(payload, "82"),
    changePercent: parseField(payload, "83"),
    volume: parseField(payload, "87_raw") ?? parseField(payload, "87"),
  };
}

/** Parse IBKR smd WebSocket JSON payload into quote updates (for tests + session). */
export function parseSmdMessagePayload(
  parsed: unknown,
  conidToSymbol: Map<number, string>,
): SmdQuoteUpdate[] {
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  const updates: SmdQuoteUpdate[] = [];

  for (const row of rows) {
    if (typeof row !== "object" || row == null) continue;
    const record = row as Record<string, unknown>;
    const conidRaw = record.conid ?? record.conidEx;
    const conid =
      typeof conidRaw === "number"
        ? conidRaw
        : typeof conidRaw === "string"
          ? Number(conidRaw)
          : NaN;
    if (!Number.isFinite(conid)) continue;
    const symbol = conidToSymbol.get(conid);
    if (!symbol) continue;
    updates.push(mapSmdPayload(symbol, conid, record));
  }

  return updates;
}

export function createIbkrSmdSession(
  ibkr: IbkrClient,
  options?: { sslVerify?: boolean },
): IbkrSmdSession {
  const sslVerify = options?.sslVerify ?? ibkr.config.sslVerify;
  const resolver = createContractResolver(ibkr);
  const conidToSymbol = new Map<number, string>();
  const subscribedConids = new Set<number>();
  const handlers = new Set<(updates: SmdQuoteUpdate[]) => void>();

  let ws: WebSocket | null = null;
  let sessionId: string | undefined;
  let closed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  function emit(updates: SmdQuoteUpdate[]): void {
    if (updates.length === 0) return;
    for (const handler of handlers) {
      handler(updates);
    }
  }

  function sendSmdSubscribe(conid: number): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const args = JSON.stringify({ fields: QUOTE_FIELDS });
    ws.send(`smd+${conid}+${args}`);
  }

  function sendSmdUnsubscribe(conid: number): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(`umd+${conid}+{}`);
  }

  function handleMessage(raw: WebSocket.RawData): void {
    const text = raw.toString();
    if (!text || text === "[]") return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      return;
    }

    emit(parseSmdMessagePayload(parsed, conidToSymbol));
  }

  async function ensureConnected(): Promise<boolean> {
    if (closed) return false;
    if (ws && ws.readyState === WebSocket.OPEN) return true;

    await ibkr.ensureSessionForMarketData();
    const tickle = await ibkr.tickle();
    sessionId = tickle.session ?? ibkr.getSessionId();
    if (!sessionId) return false;

    const wsUrl = getIbkrWebSocketUrl(ibkr.config.baseUrl);

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(wsUrl, {
        rejectUnauthorized: sslVerify,
      });
      ws = socket;

      socket.on("open", () => {
        for (const conid of subscribedConids) {
          sendSmdSubscribe(conid);
        }
        resolve();
      });

      socket.on("message", handleMessage);

      socket.on("close", () => {
        ws = null;
        if (!closed) {
          reconnectTimer = setTimeout(() => {
            void ensureConnected();
          }, 3000);
        }
      });

      socket.on("error", (error) => {
        if (socket.readyState !== WebSocket.OPEN) {
          reject(error);
        }
      });
    }).catch(() => false);

    return ws?.readyState === WebSocket.OPEN;
  }

  return {
    onUpdate(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },

    async subscribe(symbols: string[]) {
      const normalized = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
      for (const symbol of normalized) {
        const record = await resolver.resolveStockContract(symbol);
        if (!record) continue;
        conidToSymbol.set(record.conid, symbol);
        if (subscribedConids.has(record.conid)) continue;
        subscribedConids.add(record.conid);
        sendSmdSubscribe(record.conid);
      }
      await ensureConnected();
    },

    unsubscribe(symbols: string[]) {
      for (const symbol of symbols) {
        const sym = symbol.trim().toUpperCase();
        for (const [conid, mapped] of conidToSymbol.entries()) {
          if (mapped !== sym) continue;
          subscribedConids.delete(conid);
          conidToSymbol.delete(conid);
          sendSmdUnsubscribe(conid);
        }
      }
    },

    close() {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      for (const conid of subscribedConids) {
        sendSmdUnsubscribe(conid);
      }
      subscribedConids.clear();
      conidToSymbol.clear();
      ws?.close();
      ws = null;
    },

    isConnected() {
      return ws?.readyState === WebSocket.OPEN;
    },
  };
}

/** Map smd updates to EquityQuote batch. */
export function smdUpdatesToQuotes(
  updates: SmdQuoteUpdate[],
  existing: Map<string, EquityQuote>,
): EquityQuote[] {
  for (const update of updates) {
    const prev = existing.get(update.symbol);
    existing.set(update.symbol, {
      symbol: update.symbol,
      shortName: prev?.shortName,
      exchange: prev?.exchange,
      price: update.price ?? prev?.price ?? null,
      change: update.change ?? prev?.change ?? null,
      changePercent: update.changePercent ?? prev?.changePercent ?? null,
      volume: update.volume ?? prev?.volume ?? null,
      updatedAt: Date.now(),
    });
  }
  return [...existing.values()];
}

/** Process-local shared smd hub for stream sessions. */
let sharedSmdSession: IbkrSmdSession | null = null;
let sharedSmdClient: IbkrClient | null = null;

export function getSharedIbkrSmdSession(ibkr: IbkrClient): IbkrSmdSession {
  if (!sharedSmdSession || sharedSmdClient !== ibkr) {
    sharedSmdSession?.close();
    sharedSmdSession = createIbkrSmdSession(ibkr);
    sharedSmdClient = ibkr;
  }
  return sharedSmdSession;
}

export function closeSharedIbkrSmdSessionForTests(): void {
  sharedSmdSession?.close();
  sharedSmdSession = null;
  sharedSmdClient = null;
}
