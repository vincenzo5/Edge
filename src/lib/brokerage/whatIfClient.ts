import {
  WhatIfRequestSchema,
  WhatIfResultSchema,
  type WhatIfRequest,
  type WhatIfResult,
} from "@/lib/marketData/contracts/brokerage";
import type { TradingEnvironment } from "@/lib/trading/types";

export class WhatIfClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatIfClientError";
  }
}

export type FetchWhatIfPreviewOptions = {
  signal?: AbortSignal;
  environment?: TradingEnvironment;
};

export async function fetchWhatIfPreview(
  request: WhatIfRequest,
  options?: FetchWhatIfPreviewOptions,
): Promise<WhatIfResult> {
  const parsed = WhatIfRequestSchema.parse(request);
  const environment = options?.environment ?? "paper";

  const response = await fetch(
    `/api/brokerage/whatif?environment=${encodeURIComponent(environment)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
      signal: options?.signal,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    let message = "Preview unavailable";
    try {
      const body: unknown = await response.json();
      if (
        body != null &&
        typeof body === "object" &&
        "error" in body &&
        typeof (body as { error: unknown }).error === "string"
      ) {
        message = (body as { error: string }).error;
      }
    } catch {
      /* ignore parse errors */
    }
    throw new WhatIfClientError(message);
  }

  const body: unknown = await response.json();
  if (body == null || typeof body !== "object" || !("result" in body)) {
    throw new WhatIfClientError("Invalid preview response");
  }

  const parsedResult = WhatIfResultSchema.safeParse((body as { result: unknown }).result);
  if (!parsedResult.success) {
    throw new WhatIfClientError("Invalid preview response");
  }

  return parsedResult.data;
}
