import type {
  OrderDraft,
  OrderIntent,
  OrderPreview,
  PlacedOrderResult,
  SubmitOrderRequest,
  TradingAccount,
  TradingEnvironment,
} from "./types";

export class TradingApiError extends Error {
  readonly status: number;
  readonly reasons?: string[];
  readonly category?: string;

  constructor(
    message: string,
    status: number,
    extras?: { reasons?: string[]; category?: string },
  ) {
    super(message);
    this.name = "TradingApiError";
    this.status = status;
    this.reasons = extras?.reasons;
    this.category = extras?.category;
  }
}

type TradingErrorBody = {
  error?: string;
  reasons?: string[];
  category?: string;
};

async function parseTradingResponse<T>(res: Response): Promise<T> {
  let body: TradingErrorBody & T;
  try {
    body = (await res.json()) as TradingErrorBody & T;
  } catch {
    if (!res.ok) {
      throw new TradingApiError(`Trading request failed (${res.status})`, res.status);
    }
    throw new TradingApiError("Invalid trading response", res.status);
  }

  if (!res.ok) {
    throw new TradingApiError(
      body.error ?? `Trading request failed (${res.status})`,
      res.status,
      { reasons: body.reasons, category: body.category },
    );
  }

  return body;
}

export type TradingAccountsResponse = {
  accounts: TradingAccount[];
  defaultAccountId: string;
};

export async function fetchTradingAccounts(
  environment?: TradingEnvironment,
  baseUrl = "",
): Promise<TradingAccountsResponse> {
  const query = environment ? `?environment=${encodeURIComponent(environment)}` : "";
  const res = await fetch(`${baseUrl}/api/trading/accounts${query}`, { cache: "no-store" });
  return parseTradingResponse<TradingAccountsResponse>(res);
}

export async function previewOrder(
  draft: OrderDraft,
  baseUrl = "",
): Promise<{ preview: OrderPreview; intent: OrderIntent }> {
  const res = await fetch(`${baseUrl}/api/trading/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  return parseTradingResponse<{ preview: OrderPreview; intent: OrderIntent }>(res);
}

export async function submitOrder(
  request: SubmitOrderRequest,
  baseUrl = "",
): Promise<PlacedOrderResult> {
  const res = await fetch(`${baseUrl}/api/trading/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return parseTradingResponse<PlacedOrderResult>(res);
}

export async function cancelOrder(
  orderId: number,
  accountId: string,
  options?: {
    intentId?: string;
    environment?: TradingEnvironment;
    liveConfirmation?: string;
  },
  baseUrl = "",
): Promise<{ order: unknown; intent?: OrderIntent }> {
  const params = new URLSearchParams({ accountId });
  if (options?.intentId?.trim()) params.set("intentId", options.intentId.trim());
  if (options?.environment) params.set("environment", options.environment);
  if (options?.liveConfirmation?.trim()) {
    params.set("liveConfirmation", options.liveConfirmation.trim());
  }
  const res = await fetch(
    `${baseUrl}/api/trading/orders/${orderId}?${params.toString()}`,
    { method: "DELETE" },
  );
  return parseTradingResponse<{ order: unknown; intent?: OrderIntent }>(res);
}
