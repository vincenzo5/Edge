import type {
  IbkrContractClassification,
  MarketContextClassification,
  MarketContextSource,
  TwsContractDetails,
} from "../contracts/marketContext";
import type { FmpCompanyProfile } from "../contracts/fmp";
import type { FundamentalsSnapshot } from "../contracts/fundamentals";

function classification(
  label: string | null | undefined,
  source: MarketContextSource,
  confidence: MarketContextClassification["confidence"],
): MarketContextClassification | null {
  const trimmed = label?.trim();
  if (!trimmed) return null;
  return { label: trimmed, source, confidence };
}

/** IB/TWS often expose category as sector-like and industry as industry-like. */
export function classificationFromTwsDetails(
  details: TwsContractDetails,
): {
  name: string | null;
  exchange: string | null;
  sector: MarketContextClassification | null;
  industry: MarketContextClassification | null;
} {
  const sector =
    classification(details.category, "tws", "provider") ??
    classification(details.industry, "tws", "provider");
  const industry =
    classification(details.subcategory, "tws", "provider") ??
    (details.category && details.industry && details.category !== details.industry
      ? classification(details.industry, "tws", "provider")
      : null);

  return {
    name: details.companyName?.trim() || null,
    exchange: details.primaryExchange?.trim() || details.exchange?.trim() || null,
    sector,
    industry,
  };
}

export function classificationFromIbkr(
  info: IbkrContractClassification,
): {
  name: string | null;
  exchange: string | null;
  sector: MarketContextClassification | null;
  industry: MarketContextClassification | null;
} {
  const sector =
    classification(info.category, "ibkr", "provider") ??
    classification(info.industry, "ibkr", "provider");
  const industry =
    classification(info.subcategory, "ibkr", "provider") ??
    (info.category && info.industry && info.category !== info.industry
      ? classification(info.industry, "ibkr", "provider")
      : null);

  return {
    name: info.companyName?.trim() || null,
    exchange: info.exchange?.trim() || null,
    sector,
    industry,
  };
}

export function classificationFromFmpProfile(profile: FmpCompanyProfile): {
  name: string | null;
  exchange: string | null;
  sector: MarketContextClassification | null;
  industry: MarketContextClassification | null;
} {
  return {
    name: profile.name?.trim() || null,
    exchange: profile.exchange?.trim() || null,
    sector: classification(profile.sector, "fmp", "fallback"),
    industry: classification(profile.industry, "fmp", "fallback"),
  };
}

export function classificationFromFundamentals(fundamentals: FundamentalsSnapshot): {
  name: string | null;
  exchange: string | null;
  sector: MarketContextClassification | null;
  industry: MarketContextClassification | null;
} {
  return {
    name: fundamentals.longName?.trim() || fundamentals.shortName?.trim() || null,
    exchange: fundamentals.exchange?.trim() || null,
    sector: classification(fundamentals.sector, "yahoo", "fallback"),
    industry: classification(fundamentals.industry, "yahoo", "fallback"),
  };
}

export function mergeClassification(
  primary: MarketContextClassification | null,
  fallback: MarketContextClassification | null,
): MarketContextClassification | null {
  return primary ?? fallback;
}
