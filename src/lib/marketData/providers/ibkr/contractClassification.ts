import { asNonEmptyString } from "../../validation/parseRequest";

export function parseIbkrContractClassification(
  symbol: string,
  conid: number,
  info: Record<string, unknown>,
): {
  symbol: string;
  conid: number;
  exchange: string | null;
  companyName: string | null;
  industry: string | null;
  category: string | null;
  subcategory: string | null;
} {
  return {
    symbol: symbol.trim().toUpperCase(),
    conid,
    exchange:
      asNonEmptyString(info.exchange) ??
      asNonEmptyString(info.listingExchange) ??
      asNonEmptyString(info.primaryExchange),
    companyName:
      asNonEmptyString(info.companyName) ?? asNonEmptyString(info.description),
    industry: asNonEmptyString(info.industry),
    category: asNonEmptyString(info.category),
    subcategory: asNonEmptyString(info.subcategory),
  };
}
