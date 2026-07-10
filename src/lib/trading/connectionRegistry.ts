import type { BrokerTradingPort } from "./ports";
import type { TradingBroker, TradingEnvironment } from "./types";
import { createIbTwsTradingAdapter } from "./adapters/ibTws";
import { getStubTradingAdapter } from "./adapters/stub";
import { isTwsReadOnly, readTwsHost, readTwsLivePort, readTwsPaperPort } from "./validateOrder";

export const IB_PAPER_CONNECTION_ID = "ib-paper";
export const IB_LIVE_CONNECTION_ID = "ib-live";

export type ConnectionDescriptor = {
  broker: TradingBroker;
  connectionId: string;
  environment: TradingEnvironment;
  host: string;
  port: number;
  clientId: number;
};

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function readPaperClientId(): number {
  const paper = process.env.TWS_PAPER_CLIENT_ID?.trim();
  if (paper) return readIntEnv("TWS_PAPER_CLIENT_ID", 77);
  return readIntEnv("TWS_CLIENT_ID", 77);
}

function readLiveClientId(): number {
  const live = process.env.TWS_LIVE_CLIENT_ID?.trim();
  if (live) return readIntEnv("TWS_LIVE_CLIENT_ID", readPaperClientId() + 1);
  return readPaperClientId() + 1;
}

const IB_CONNECTION_DEFS: Array<{
  broker: TradingBroker;
  connectionId: string;
  environment: TradingEnvironment;
  port: () => number;
  clientId: () => number;
}> = [
  {
    broker: "ib",
    connectionId: IB_PAPER_CONNECTION_ID,
    environment: "paper",
    port: readTwsPaperPort,
    clientId: readPaperClientId,
  },
  {
    broker: "ib",
    connectionId: IB_LIVE_CONNECTION_ID,
    environment: "live",
    port: readTwsLivePort,
    clientId: readLiveClientId,
  },
];

function buildConnection(def: (typeof IB_CONNECTION_DEFS)[number]): ConnectionDescriptor {
  return {
    broker: def.broker,
    connectionId: def.connectionId,
    environment: def.environment,
    host: readTwsHost(),
    port: def.port(),
    clientId: def.clientId(),
  };
}

export function listIbConnections(): ConnectionDescriptor[] {
  return IB_CONNECTION_DEFS.map(buildConnection);
}

export function resolveConnectionByEnvironment(
  environment: TradingEnvironment,
): ConnectionDescriptor {
  const match = IB_CONNECTION_DEFS.find((connection) => connection.environment === environment);
  if (!match) {
    throw new Error(`No connection registered for environment ${environment}`);
  }
  return buildConnection(match);
}

export function resolveConnectionById(connectionId: string): ConnectionDescriptor {
  const normalized = connectionId.trim();
  const match = IB_CONNECTION_DEFS.find((connection) => connection.connectionId === normalized);
  if (!match) {
    throw new Error(`Unknown connectionId ${connectionId}`);
  }
  return buildConnection(match);
}

export function resolveConnection(
  input: { environment?: TradingEnvironment; connectionId?: string },
): ConnectionDescriptor {
  if (input.connectionId?.trim()) {
    return resolveConnectionById(input.connectionId);
  }
  if (input.environment) {
    return resolveConnectionByEnvironment(input.environment);
  }
  return resolveConnectionByEnvironment("paper");
}

export function resolveAdapter(
  broker: TradingBroker,
  connectionId?: string,
): BrokerTradingPort {
  if (broker === "stub") {
    return getStubTradingAdapter();
  }
  const resolved = connectionId
    ? resolveConnectionById(connectionId)
    : resolveConnectionByEnvironment("paper");
  return createIbTwsTradingAdapter(resolved.connectionId);
}

/** True when mutations are allowed for the given environment (non-readonly sidecar). */
export function isTradingEnvironmentConfigured(environment: TradingEnvironment): boolean {
  if (isTwsReadOnly()) return false;
  void environment;
  return true;
}

/** Trading is available when at least paper mutations are configured. */
export function isTradingConfigured(): boolean {
  return isTradingEnvironmentConfigured("paper");
}

export function connectionQuery(connectionId: string): string {
  return `connectionId=${encodeURIComponent(connectionId)}`;
}
