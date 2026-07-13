import type {
  AccountOrder,
  AccountStatus,
  WhatIfRequest,
  WhatIfResult,
} from "@/lib/marketData/contracts/brokerage";
import { sidecarAuthHeaders } from "@/lib/marketData/providers/tws/sidecarAuth";
import {
  BrokerageRequestError,
  createBrokerageClient,
  type BrokerageClientConfig,
} from "@/lib/brokerage/brokerageClient";
import {
  classifyBrokerageError,
  recordBrokerageFailure,
  recordBrokerageSuccess,
  shouldTryBrokerage,
} from "@/lib/brokerage/brokerageHealthGate";
import { filterOrdersByAccount } from "@/lib/brokerage/filterOrders";
import {
  connectionQuery,
  IB_PAPER_CONNECTION_ID,
  resolveConnectionById,
} from "../connectionRegistry";
import type { BrokerTradingPort } from "../ports";
import type { OrderDraft, OrderModifyPatch, OrderPreview, TradingAccount } from "../types";

type PlaceOrderResponse = {
  order: AccountOrder;
  updatedAt: number;
};

type CancelOrderResponse = {
  order: AccountOrder;
  updatedAt: number;
};

type ModifyOrderResponse = {
  order: AccountOrder;
  updatedAt: number;
};

function parsePositiveMs(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readConfig(): BrokerageClientConfig {
  const baseUrl = process.env.TWS_SIDECAR_URL?.trim() ?? "http://127.0.0.1:8765";
  const timeoutMs = parsePositiveMs(process.env.TWS_SIDECAR_TIMEOUT_MS, 15_000);
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    timeoutMs,
  };
}

function toRequestError(error: unknown): BrokerageRequestError {
  if (error instanceof BrokerageRequestError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const category = classifyBrokerageError(error);
  if (category === "request_timeout" || message.toLowerCase().includes("timeout")) {
    return new BrokerageRequestError("request_timeout", message);
  }
  return new BrokerageRequestError(category, message);
}

function mapStatusToAccounts(status: AccountStatus, connectionId: string): TradingAccount[] {
  const connection = resolveConnectionById(connectionId);
  return status.managedAccounts.map((accountId) => ({
    broker: "ib" as const,
    connectionId: connection.connectionId,
    accountId,
    environment: connection.environment,
    availability: "online" as const,
  }));
}

function mapWhatIfToPreview(result: WhatIfResult): OrderPreview {
  const warnings: string[] = [];
  if (result.warningText) warnings.push(result.warningText);
  return {
    symbol: result.symbol,
    side: result.action,
    quantity: result.quantity,
    orderType: result.orderType,
    limitPrice: result.limitPrice ?? null,
    stopPrice: result.stopPrice ?? null,
    initMarginChange: result.initMarginChange ?? null,
    maintMarginChange: result.maintMarginChange ?? null,
    equityWithLoanChange: result.equityWithLoanChange ?? null,
    commission: result.commission ?? null,
    minCommission: result.minCommission ?? null,
    maxCommission: result.maxCommission ?? null,
    warnings,
    updatedAt: result.updatedAt,
  };
}

function draftToWhatIf(draft: OrderDraft): WhatIfRequest {
  return {
    symbol: draft.symbol.trim().toUpperCase(),
    action: draft.side,
    quantity: draft.quantity,
    orderType: draft.orderType,
    limitPrice: draft.limitPrice,
    stopPrice: draft.stopPrice,
  };
}

function draftToPlaceBody(draft: OrderDraft, connectionId: string) {
  return {
    accountId: draft.accountId.trim(),
    symbol: draft.symbol.trim().toUpperCase(),
    action: draft.side,
    quantity: draft.quantity,
    orderType: draft.orderType,
    limitPrice: draft.limitPrice,
    stopPrice: draft.stopPrice,
    outsideRth: draft.outsideRth ?? false,
    tif: draft.tif,
    orderRef: draft.orderRef,
    connectionId,
  };
}

export class IbTwsTradingAdapter implements BrokerTradingPort {
  private readonly config: BrokerageClientConfig;
  private readonly connectionId: string;
  private readonly brokerageClient: ReturnType<typeof createBrokerageClient>;

  constructor(
    connectionIdOrConfig: string | BrokerageClientConfig = IB_PAPER_CONNECTION_ID,
    config?: BrokerageClientConfig,
  ) {
    if (typeof connectionIdOrConfig === "string") {
      this.connectionId = connectionIdOrConfig;
      this.config = config ?? readConfig();
    } else {
      this.connectionId = IB_PAPER_CONNECTION_ID;
      this.config = connectionIdOrConfig;
    }
    this.brokerageClient = createBrokerageClient(this.config, this.connectionId);
  }

  getConnectionId(): string {
    return this.connectionId;
  }

  private async request<T>(
    pathWithQuery: string,
    options: {
      method?: "GET" | "POST" | "DELETE" | "PATCH";
      body?: unknown;
    } = {},
  ): Promise<T> {
    if (!shouldTryBrokerage()) {
      throw new BrokerageRequestError(
        "request_failed",
        "Trading requests temporarily skipped after repeated failures",
      );
    }

    const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
    const url = `${this.config.baseUrl}${path}`;
    const method = options.method ?? "GET";
    try {
      const res = await fetch(url, {
        method,
        headers: sidecarAuthHeaders(
          options.body != null
            ? { "Content-Type": "application/json", Accept: "application/json" }
            : { Accept: "application/json" },
        ),
        body: options.body != null ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
      const text = await res.text();
      let json: unknown = null;
      if (text) {
        try {
          json = JSON.parse(text) as unknown;
        } catch {
          json = text;
        }
      }
      if (!res.ok) {
        const detail =
          typeof json === "object" &&
          json != null &&
          "detail" in json &&
          typeof (json as { detail?: unknown }).detail === "string"
            ? (json as { detail: string }).detail
            : text || `${method} ${path} failed (${res.status})`;
        throw toRequestError(new Error(detail));
      }
      recordBrokerageSuccess();
      return json as T;
    } catch (error) {
      recordBrokerageFailure(error);
      throw toRequestError(error);
    }
  }

  private connectionSuffix(): string {
    const separator = "?";
    return `${separator}${connectionQuery(this.connectionId)}`;
  }

  async listAccounts(): Promise<TradingAccount[]> {
    const status = await this.brokerageClient.getStatus();
    return mapStatusToAccounts(status, this.connectionId);
  }

  async preview(draft: OrderDraft): Promise<OrderPreview> {
    const result = await this.brokerageClient.whatIfOrder(draftToWhatIf(draft));
    return mapWhatIfToPreview(result);
  }

  async place(draft: OrderDraft): Promise<{ order: AccountOrder; orderRef: string }> {
    const orderRef = draft.orderRef?.trim();
    if (!orderRef) {
      throw new BrokerageRequestError("request_failed", "orderRef is required for place");
    }
    const body = draftToPlaceBody({ ...draft, orderRef }, this.connectionId);
    const response = await this.request<PlaceOrderResponse>("/trading/orders", {
      method: "POST",
      body,
    });
    return {
      order: response.order,
      orderRef,
    };
  }

  async cancel(accountId: string, orderId: number): Promise<{ order: AccountOrder }> {
    void accountId;
    const response = await this.request<CancelOrderResponse>(
      `/trading/orders/${orderId}${this.connectionSuffix()}`,
      { method: "DELETE" },
    );
    return { order: response.order };
  }

  async modify(
    accountId: string,
    orderId: number,
    patch: OrderModifyPatch,
  ): Promise<{ order: AccountOrder }> {
    const response = await this.request<ModifyOrderResponse>(
      `/trading/orders/${orderId}`,
      {
        method: "PATCH",
        body: {
          accountId: accountId.trim(),
          connectionId: this.connectionId,
          ...patch,
        },
      },
    );
    return { order: response.order };
  }

  async listOpenOrders(accountId?: string): Promise<AccountOrder[]> {
    const accountQuery = accountId?.trim()
      ? `&accountId=${encodeURIComponent(accountId.trim())}`
      : "";
    const response = await this.request<{ orders: AccountOrder[]; updatedAt: number }>(
      `/account/orders?${connectionQuery(this.connectionId)}${accountQuery}`,
    );
    return filterOrdersByAccount(response.orders, accountId);
  }
}

const adapterCache = new Map<string, IbTwsTradingAdapter>();

export function createIbTwsTradingAdapter(
  connectionId: string = IB_PAPER_CONNECTION_ID,
  config?: BrokerageClientConfig,
): IbTwsTradingAdapter {
  if (!config) {
    const cached = adapterCache.get(connectionId);
    if (cached) return cached;
    const adapter = new IbTwsTradingAdapter(connectionId);
    adapterCache.set(connectionId, adapter);
    return adapter;
  }
  return new IbTwsTradingAdapter(connectionId, config);
}

/** @deprecated Use createIbTwsTradingAdapter */
export function getIbTwsTradingAdapter(): IbTwsTradingAdapter {
  return createIbTwsTradingAdapter(IB_PAPER_CONNECTION_ID);
}

export function resetIbTwsTradingAdapterForTests(): void {
  adapterCache.clear();
}
