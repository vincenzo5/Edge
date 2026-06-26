export const MARKET_DATA_TRACE_HEADER = "x-edge-md-trace-id";
export const MARKET_DATA_SCENARIO_HEADER = "x-edge-md-scenario";

export function createMarketDataTraceId(scenario: string): string {
  const slug = scenario.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 64);
  return `${slug}:${Date.now()}`;
}

export function readMarketDataTraceFromRequest(request: Request): {
  traceId: string;
  scenario?: string;
} {
  const traceId =
    request.headers.get(MARKET_DATA_TRACE_HEADER)?.trim() ||
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `md-${Date.now()}`);
  const scenario = request.headers.get(MARKET_DATA_SCENARIO_HEADER)?.trim() || undefined;
  return { traceId, scenario };
}

export function marketDataTraceHeaders(
  traceId: string,
  scenario?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    [MARKET_DATA_TRACE_HEADER]: traceId,
  };
  if (scenario) {
    headers[MARKET_DATA_SCENARIO_HEADER] = scenario;
  }
  return headers;
}
