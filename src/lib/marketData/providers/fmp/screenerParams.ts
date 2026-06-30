import type { ScreenQuery } from "../../schemas/request";

function appendTextParam(
  params: Record<string, string>,
  key: string,
  value: string | string[] | undefined,
): void {
  if (!value) return;
  if (Array.isArray(value)) {
    params[key] = value.join(",");
    return;
  }
  params[key] = value;
}

function appendRange(
  params: Record<string, string>,
  prefix: string,
  range?: { min?: number; max?: number },
): void {
  if (!range) return;
  if (range.min != null) params[`${prefix}MoreThan`] = String(range.min);
  if (range.max != null) params[`${prefix}LowerThan`] = String(range.max);
}

export function screenQueryToFmpParams(query: ScreenQuery): Record<string, string> {
  const params: Record<string, string> = {
    limit: String(query.limit ?? 200),
  };

  if (query.sector) appendTextParam(params, "sector", query.sector);
  if (query.industry) appendTextParam(params, "industry", query.industry);
  if (query.country) appendTextParam(params, "country", query.country);
  if (query.exchange) appendTextParam(params, "exchange", query.exchange);
  if (query.isEtf != null) params.isEtf = String(query.isEtf);
  if (query.isActivelyTrading != null) {
    params.isActivelyTrading = String(query.isActivelyTrading);
  }
  if (query.offset != null) params.offset = String(query.offset);

  appendRange(params, "marketCap", query.marketCap);
  appendRange(params, "price", query.price);
  appendRange(params, "beta", query.beta);
  appendRange(params, "volume", query.volume);
  appendRange(params, "dividend", query.dividend);

  return params;
}
