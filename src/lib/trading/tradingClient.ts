import type {
  BracketPlan,
  BracketPlacedResult,
  OrderDraft,
  OrderIntent,
  OrderPreview,
  PlacedOrderResult,
  ProtectiveOcoPlan,
  ProtectiveOcoPlacedResult,
  SubmitBracketRequest,
  SubmitOrderRequest,
  SubmitProtectiveOcoRequest,
  TradingAccount,
  TradingEnvironment,
} from "./types";
import type { PlaybookInstance } from "./playbook/types";

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

export async function submitBracket(
  request: SubmitBracketRequest,
  baseUrl = "",
): Promise<BracketPlacedResult> {
  const res = await fetch(`${baseUrl}/api/trading/brackets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return parseTradingResponse<BracketPlacedResult>(res);
}

export async function submitProtectiveOco(
  request: SubmitProtectiveOcoRequest,
  baseUrl = "",
): Promise<ProtectiveOcoPlacedResult> {
  const res = await fetch(`${baseUrl}/api/trading/oco`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return parseTradingResponse<ProtectiveOcoPlacedResult>(res);
}

export async function fetchPlaybookInstances(
  accountId: string,
  options?: { activeOnly?: boolean },
  baseUrl = "",
): Promise<PlaybookInstance[]> {
  const params = new URLSearchParams({ accountId });
  if (options?.activeOnly === false) {
    params.set("activeOnly", "false");
  }
  const res = await fetch(`${baseUrl}/api/trading/playbooks?${params.toString()}`, {
    cache: "no-store",
  });
  const body = await parseTradingResponse<{ instances: PlaybookInstance[] }>(res);
  return body.instances;
}

export async function detachPlaybookInstance(
  instanceId: string,
  baseUrl = "",
): Promise<PlaybookInstance> {
  const res = await fetch(`${baseUrl}/api/trading/playbooks/${encodeURIComponent(instanceId)}/detach`, {
    method: "POST",
  });
  const body = await parseTradingResponse<{ instance: PlaybookInstance }>(res);
  return body.instance;
}

async function postPlaybookInstanceAction(
  instanceId: string,
  action: "pause" | "resume" | "skip",
  baseUrl = "",
): Promise<PlaybookInstance> {
  const res = await fetch(
    `${baseUrl}/api/trading/playbooks/${encodeURIComponent(instanceId)}/${action}`,
    { method: "POST" },
  );
  const body = await parseTradingResponse<{ instance: PlaybookInstance }>(res);
  return body.instance;
}

export async function pausePlaybookInstance(
  instanceId: string,
  baseUrl = "",
): Promise<PlaybookInstance> {
  return postPlaybookInstanceAction(instanceId, "pause", baseUrl);
}

export async function resumePlaybookInstance(
  instanceId: string,
  baseUrl = "",
): Promise<PlaybookInstance> {
  return postPlaybookInstanceAction(instanceId, "resume", baseUrl);
}

export async function skipNextPlaybookRule(
  instanceId: string,
  baseUrl = "",
): Promise<PlaybookInstance> {
  return postPlaybookInstanceAction(instanceId, "skip", baseUrl);
}

export type PlaybookAutoManageSettings = {
  paperEnabled: boolean;
  liveEnabled: boolean;
  liveConsentAt?: string;
};

export async function fetchPlaybookAutoManageSettings(
  baseUrl = "",
): Promise<PlaybookAutoManageSettings> {
  const res = await fetch(`${baseUrl}/api/trading/playbooks/auto-manage`, {
    cache: "no-store",
  });
  const body = await parseTradingResponse<{ settings: PlaybookAutoManageSettings }>(res);
  return body.settings;
}

export async function patchPlaybookAutoManageSettings(
  patch: {
    paperEnabled?: boolean;
    liveEnabled?: boolean;
    liveConfirmation?: string;
  },
  baseUrl = "",
): Promise<PlaybookAutoManageSettings> {
  const res = await fetch(`${baseUrl}/api/trading/playbooks/auto-manage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const body = await parseTradingResponse<{ settings: PlaybookAutoManageSettings }>(res);
  return body.settings;
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

export async function modifyOrder(
  orderId: number,
  accountId: string,
  patch: Record<string, unknown>,
  options?: {
    intentId?: string;
    environment?: TradingEnvironment;
    liveConfirmation?: string;
  },
  baseUrl = "",
): Promise<{ order: unknown; intent?: OrderIntent | null }> {
  const params = new URLSearchParams({ accountId });
  if (options?.intentId?.trim()) params.set("intentId", options.intentId.trim());
  if (options?.environment) params.set("environment", options.environment);
  if (options?.liveConfirmation?.trim()) {
    params.set("liveConfirmation", options.liveConfirmation.trim());
  }
  const body =
    options?.liveConfirmation?.trim() && !("liveConfirmation" in patch)
      ? { ...patch, liveConfirmation: options.liveConfirmation.trim() }
      : patch;
  const res = await fetch(
    `${baseUrl}/api/trading/orders/${orderId}?${params.toString()}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return parseTradingResponse<{ order: unknown; intent?: OrderIntent | null }>(res);
}
