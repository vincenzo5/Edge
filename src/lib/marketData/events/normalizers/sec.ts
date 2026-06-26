import type { SecFiling } from "../../contracts/fundamentals";
import type { MarketEvent } from "../../contracts/events";
import { defaultImportanceForCanonicalId } from "../importance";
import { secFormToCanonicalId } from "../providerMappings";

export function normalizeSecFiling(filing: SecFiling): MarketEvent {
  const canonicalId = secFormToCanonicalId(filing.form);
  return {
    id: `sec-filing-${filing.symbol}-${filing.accessionNumber}`,
    canonicalId,
    family: "filing",
    category: filing.form,
    title: `${filing.symbol} ${filing.form}`,
    scheduledAt: filing.filedAt,
    actualAt: filing.filedAt,
    status: "released",
    importance: defaultImportanceForCanonicalId(canonicalId),
    country: "US",
    symbol: filing.symbol,
    affectedAssets: [filing.symbol],
    source: "sec",
    sourceEventId: filing.accessionNumber,
    coverageLevel: "full",
    details: {
      form: filing.form,
      cik: filing.cik,
      url: filing.url,
      primaryDocument: filing.primaryDocument,
    },
  };
}
