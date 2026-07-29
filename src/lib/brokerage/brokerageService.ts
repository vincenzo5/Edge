import type {
  AccountExecution,
  AccountOrder,
  AccountPnL,
  AccountPosition,
  AccountStatus,
  AccountSummary,
  WhatIfRequest,
  WhatIfResult,
} from "../marketData/contracts/brokerage";
import { shouldTryBrokerage } from "./brokerageHealthGate";
import {
  BrokerageRequestError,
  getBrokerageClient,
  isBrokerageConfigured,
  probeSidecarLiveness,
} from "./brokerageClient";
import { awaitSidecarForBrokerage } from "@/lib/marketData/providers/tws/startup";
import { resolveConnectionByEnvironment } from "@/lib/trading/connectionRegistry";
import type { TradingEnvironment } from "@/lib/trading/types";
import {
  assertTradingEnvironmentAllowed,
  readTradingEnvironmentLock,
} from "@/lib/trading/validateOrder";

export type BrokerageSnapshot = {
  status: AccountStatus | null;
  summary: AccountSummary | null;
  positions: AccountPosition[];
  pnl: AccountPnL | null;
  orders: AccountOrder[];
  executions: AccountExecution[];
  updatedAt: number;
};

const EMPTY_SNAPSHOT: BrokerageSnapshot = {
  status: null,
  summary: null,
  positions: [],
  pnl: null,
  orders: [],
  executions: [],
  updatedAt: 0,
};

export class BrokerageService {
  isConfigured(): boolean {
    return isBrokerageConfigured();
  }

  getClient() {
    return getBrokerageClient();
  }

  async getSnapshot(environment: TradingEnvironment = "paper"): Promise<BrokerageSnapshot> {
    assertTradingEnvironmentAllowed(environment);
    const connection = resolveConnectionByEnvironment(environment);
    const client = getBrokerageClient(connection.connectionId);
    if (!client) return EMPTY_SNAPSHOT;

    if (!shouldTryBrokerage()) {
      throw new BrokerageRequestError(
        "sidecar_unreachable",
        "Brokerage requests temporarily skipped after repeated failures",
      );
    }

    await awaitSidecarForBrokerage();

    // Fast-fail when the sidecar process is up but unresponsive. Without this,
    // each sub-request below waits the full TWS_SIDECAR_TIMEOUT_MS (often 60-120s)
    // when the sidecar is hung, starving the Next.js route handlers and stalling
    // unrelated traffic (e.g. /api/candles) for minutes.
    const live = await probeSidecarLiveness(client.getConfig(), 2_000);
    if (!live) {
      throw new BrokerageRequestError(
        "sidecar_unreachable",
        "TWS sidecar did not respond to /status within 2s. Is IB Gateway reachable?",
      );
    }

    const [status, summary, positionsResult, pnl, ordersResult, tradesResult] =
      await Promise.allSettled([
        client.getStatus(),
        client.getSummary(),
        client.getPositions(),
        client.getPnL(),
        client.getOrders(),
        client.getTrades(),
      ]);

    const firstError = [status, summary, positionsResult, pnl, ordersResult, tradesResult].find(
      (result) => result.status === "rejected",
    );
    if (
      firstError?.status === "rejected" &&
      status.status === "rejected" &&
      summary.status === "rejected"
    ) {
      throw firstError.reason;
    }

    const summaryValue = summary.status === "fulfilled" ? summary.value : null;
    const pnlValue = pnl.status === "fulfilled" ? pnl.value : null;

    return {
      status: status.status === "fulfilled" ? status.value : null,
      summary: summaryValue,
      positions:
        positionsResult.status === "fulfilled" ? positionsResult.value.positions : [],
      pnl: pnlValue ?? summaryValue?.pnl ?? null,
      orders: ordersResult.status === "fulfilled" ? ordersResult.value.orders : [],
      executions:
        tradesResult.status === "fulfilled" ? tradesResult.value.executions : [],
      updatedAt: Date.now(),
    };
  }

  async getStatus(): Promise<AccountStatus | null> {
    const client = getBrokerageClient();
    if (!client) return null;
    try {
      return await client.getStatus();
    } catch (error) {
      if (error instanceof BrokerageRequestError && error.category === "disabled") {
        return null;
      }
      throw error;
    }
  }

  async previewOrder(
    request: WhatIfRequest,
    environment: TradingEnvironment = "paper",
  ): Promise<WhatIfResult> {
    assertTradingEnvironmentAllowed(environment);
    const connection = resolveConnectionByEnvironment(environment);
    const client = getBrokerageClient(connection.connectionId);
    if (!client) {
      throw new BrokerageRequestError(
        "disabled",
        "Brokerage tracking unavailable.",
      );
    }
    await awaitSidecarForBrokerage();
    return client.whatIfOrder(request);
  }
}

let singletonService: BrokerageService | null = null;

export function getBrokerageService(): BrokerageService {
  if (!singletonService) {
    singletonService = new BrokerageService();
  }
  return singletonService;
}

export { BrokerageRequestError, isBrokerageConfigured };
