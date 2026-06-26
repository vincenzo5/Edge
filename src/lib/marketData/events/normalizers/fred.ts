import type { EconomicRelease } from "../../contracts/macro";
import type { MarketEvent } from "../../contracts/events";
import { defaultImportanceForCanonicalId } from "../importance";
import { fredReleaseToCanonicalId, getDefinitionForCanonicalId } from "../providerMappings";

export function normalizeFredRelease(release: EconomicRelease): MarketEvent | null {
  const canonicalId = fredReleaseToCanonicalId(release.name);
  if (!canonicalId) return null;

  const def = getDefinitionForCanonicalId(canonicalId);
  const title = def?.title ?? release.name;

  return {
    id: `fred-release-${release.releaseId}-${release.date}`,
    canonicalId,
    family: "macro",
    category: release.name,
    title,
    scheduledAt: release.date,
    status: "released",
    importance: defaultImportanceForCanonicalId(canonicalId),
    country: "US",
    affectedAssets: ["SPY", "QQQ"],
    source: "fred",
    sourceEventId: release.releaseId,
    coverageLevel: "partial",
    details: {
      releaseName: release.name,
      note: "FRED release metadata only — no consensus/actual card",
    },
  };
}

export function normalizeFredReleases(releases: EconomicRelease[]): MarketEvent[] {
  return releases
    .map(normalizeFredRelease)
    .filter((event): event is MarketEvent => event != null);
}
