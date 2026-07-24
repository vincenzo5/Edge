import type { DataProviderId, DataProviderPreference } from "@/lib/connections/types";
import type { ProviderCapability } from "./state/capabilities";
import { providerSupportsCapability } from "./state/capabilities";

/** Providers that may satisfy brokerage_truth / trading_decision — user disable ignored on those paths. */
export const BROKER_BACKED_PROVIDER_IDS = ["tws", "ibkr"] as const satisfies readonly DataProviderId[];

export type TrustUsage = "display" | "brokerage_truth" | "trading_decision";

/** Default product order for display waterfalls (Phase 2 baseline). */
export const DEFAULT_DISPLAY_PROVIDER_ORDER: readonly DataProviderId[] = [
  "tws",
  "ibkr",
  "massive",
  "yahoo",
];

/** Providers users may reorder in Settings (display waterfalls only). */
export const WATERFALL_PREFERENCE_PROVIDER_IDS: readonly DataProviderId[] = [
  "tws",
  "ibkr",
  "yahoo",
  "massive",
];

const CAPABILITY_DEFAULT_ORDER: Partial<Record<ProviderCapability, readonly DataProviderId[]>> = {
  equity_candles: ["tws", "ibkr", "yahoo"],
  equity_quotes: ["tws", "ibkr", "yahoo"],
  options_chain: ["massive", "tws", "ibkr"],
  options_expirations: ["massive", "tws", "ibkr"],
};

export function createDefaultDataProviderPreference(): DataProviderPreference {
  return {
    orderedProviders: [...DEFAULT_DISPLAY_PROVIDER_ORDER],
    disabledProviders: [],
  };
}

export function isPreferenceIgnoredForUsage(usage: TrustUsage | undefined): boolean {
  return usage === "brokerage_truth" || usage === "trading_decision";
}

export function mergeProviderOrder(
  preferenceOrder: readonly DataProviderId[],
  capability: ProviderCapability,
): DataProviderId[] {
  const capabilityDefault = CAPABILITY_DEFAULT_ORDER[capability] ?? DEFAULT_DISPLAY_PROVIDER_ORDER;
  const seen = new Set<DataProviderId>();
  const merged: DataProviderId[] = [];
  for (const id of preferenceOrder) {
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
  }
  for (const id of capabilityDefault) {
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
  }
  return merged;
}

function isProviderConfigured(
  providerId: DataProviderId,
  configured: ReadonlySet<DataProviderId>,
): boolean {
  if (providerId === "yahoo") return true;
  return configured.has(providerId);
}

export function resolveWaterfallOrder(args: {
  preference?: DataProviderPreference;
  configured: ReadonlySet<DataProviderId>;
  capability: ProviderCapability;
  respectPreference?: boolean;
  usage?: TrustUsage;
}): DataProviderId[] {
  const respectPreference = args.respectPreference !== false && args.preference != null;
  const preference = args.preference ?? createDefaultDataProviderPreference();
  const ignoreDisable = !respectPreference || isPreferenceIgnoredForUsage(args.usage);
  const ignoreUserOrder = isPreferenceIgnoredForUsage(args.usage);
  const merged = ignoreUserOrder
    ? mergeProviderOrder([], args.capability)
    : mergeProviderOrder(preference.orderedProviders, args.capability);

  return merged.filter((providerId) => {
    if (!providerSupportsCapability(providerId, args.capability)) return false;
    if (!isProviderConfigured(providerId, args.configured)) return false;
    if (preference.disabledProviders.includes(providerId)) {
      if (ignoreDisable && BROKER_BACKED_PROVIDER_IDS.includes(providerId as (typeof BROKER_BACKED_PROVIDER_IDS)[number])) {
        return true;
      }
      if (!ignoreDisable) return false;
    }
    return true;
  });
}

export function canDisableProvider(args: {
  providerId: DataProviderId;
  preference: DataProviderPreference;
  configured: ReadonlySet<DataProviderId>;
  capability: ProviderCapability;
}): boolean {
  if (args.preference.disabledProviders.includes(args.providerId)) return true;
  const hypothetical: DataProviderPreference = {
    ...args.preference,
    disabledProviders: [...args.preference.disabledProviders, args.providerId],
  };
  return (
    resolveWaterfallOrder({
      preference: hypothetical,
      configured: args.configured,
      capability: args.capability,
      respectPreference: true,
      usage: "display",
    }).length >= 1
  );
}

export function shouldSkipHotCacheSource(args: {
  hotSource: string | undefined;
  preference?: DataProviderPreference;
  configured: ReadonlySet<DataProviderId>;
  capability: ProviderCapability;
  respectPreference?: boolean;
}): boolean {
  const respectPreference = args.respectPreference !== false;
  if (!args.hotSource) return false;

  if (!respectPreference || !args.preference) {
    return (
      args.hotSource === "yahoo" &&
      (args.configured.has("tws") || args.configured.has("ibkr"))
    );
  }

  const order = resolveWaterfallOrder({
    preference: args.preference,
    configured: args.configured,
    capability: args.capability,
    respectPreference: true,
    usage: "display",
  });
  if (order.length === 0) return false;

  const preferred = order[0];
  if (args.hotSource === preferred) return false;

  const hotIndex = order.indexOf(args.hotSource as DataProviderId);
  if (hotIndex === -1) return true;
  return hotIndex > 0;
}

export function moveProviderInOrder(
  order: readonly DataProviderId[],
  providerId: DataProviderId,
  direction: "up" | "down",
): DataProviderId[] {
  const next = [...order];
  const index = next.indexOf(providerId);
  if (index === -1) return next;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function toggleProviderDisabled(
  preference: DataProviderPreference,
  providerId: DataProviderId,
  disabled: boolean,
): DataProviderPreference {
  const disabledProviders = new Set(preference.disabledProviders);
  if (disabled) {
    disabledProviders.add(providerId);
  } else {
    disabledProviders.delete(providerId);
  }
  return {
    ...preference,
    disabledProviders: [...disabledProviders],
  };
}
