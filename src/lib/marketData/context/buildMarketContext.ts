import type { AssetClass } from "../contracts/instruments";
import type {
  IbkrContractClassification,
  MarketContext,
  MarketContextClassification,
  TwsContractDetails,
} from "../contracts/marketContext";
import type { FmpCompanyProfile } from "../contracts/fmp";
import type { FundamentalsSnapshot } from "../contracts/fundamentals";
import {
  classificationFromFmpProfile,
  classificationFromFundamentals,
  classificationFromIbkr,
  classificationFromTwsDetails,
  mergeClassification,
} from "./normalizeClassification";
import {
  buildBreadcrumbChain,
  buildCuratedRelationships,
  buildTradableGroups,
} from "./relationshipMaps";

function inferAssetClass(secType: string | null | undefined, symbol: string): AssetClass {
  const upper = secType?.trim().toUpperCase() ?? "";
  if (upper === "IND") return "index";
  if (upper === "STK") return "equity";
  const knownEtfs = new Set(["SPY", "QQQ", "DIA", "IWM", "XLK", "XLF", "XLV", "SMH", "SOXX", "IGV", "XBI"]);
  if (knownEtfs.has(symbol.trim().toUpperCase())) return "etf";
  return "equity";
}

export function buildMarketContext(args: {
  symbol: string;
  twsDetails?: TwsContractDetails | null;
  ibkrInfo?: IbkrContractClassification | null;
  fmpProfile?: FmpCompanyProfile | null;
  fundamentals?: FundamentalsSnapshot | null;
  warnings?: string[];
}): MarketContext {
  const sym = args.symbol.trim().toUpperCase();
  const tws = args.twsDetails ? classificationFromTwsDetails(args.twsDetails) : null;
  const ibkr = args.ibkrInfo ? classificationFromIbkr(args.ibkrInfo) : null;
  const fmp = args.fmpProfile ? classificationFromFmpProfile(args.fmpProfile) : null;
  const yahoo = args.fundamentals ? classificationFromFundamentals(args.fundamentals) : null;

  const sector: MarketContextClassification | null =
    mergeClassification(tws?.sector ?? null, ibkr?.sector ?? null) ??
    mergeClassification(fmp?.sector ?? null, yahoo?.sector ?? null);

  const industry: MarketContextClassification | null =
    mergeClassification(tws?.industry ?? null, ibkr?.industry ?? null) ??
    mergeClassification(fmp?.industry ?? null, yahoo?.industry ?? null);

  const name =
    tws?.name ??
    ibkr?.name ??
    fmp?.name ??
    yahoo?.name ??
    null;

  const exchange =
    tws?.exchange ??
    ibkr?.exchange ??
    fmp?.exchange ??
    yahoo?.exchange ??
    null;

  const secType = args.twsDetails?.secType ?? null;
  const assetClass = inferAssetClass(secType, sym);

  const curated = buildCuratedRelationships({
    symbol: sym,
    sector,
    industry,
    exchange,
  });

  const relationships = buildBreadcrumbChain(curated);
  const tradableGroups = buildTradableGroups({ symbol: sym, sector, industry });

  return {
    symbol: sym,
    name,
    assetClass,
    exchange,
    sector,
    industry,
    relationships,
    tradableGroups,
    updatedAt: Date.now(),
  };
}
