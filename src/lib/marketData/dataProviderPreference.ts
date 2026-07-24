import {
  DataProviderPreferenceSchema,
  type DataProviderPreference,
} from "@/lib/connections/types";
import { clearChartClientCache } from "@/lib/chartDataFeed/chartClientCache";
import {
  createDefaultDataProviderPreference,
  WATERFALL_PREFERENCE_PROVIDER_IDS,
} from "./providerWaterfall";

export const DATA_PROVIDER_PREFERENCE_KEY = "edge:marketData:providerPreference:v1";

const DATA_PROVIDER_PREFERENCE_EVENT = "edge:dataProviderPreference";

function notifyDataProviderPreferenceChange(preference: DataProviderPreference): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<DataProviderPreference>(DATA_PROVIDER_PREFERENCE_EVENT, {
      detail: preference,
    }),
  );
}

export function normalizeDataProviderPreference(
  raw: DataProviderPreference | null | undefined,
): DataProviderPreference {
  const parsed = DataProviderPreferenceSchema.safeParse(raw);
  if (!parsed.success) {
    return createDefaultDataProviderPreference();
  }
  const ordered = parsed.data.orderedProviders.filter((id) =>
    WATERFALL_PREFERENCE_PROVIDER_IDS.includes(id),
  );
  const disabled = parsed.data.disabledProviders.filter((id) =>
    WATERFALL_PREFERENCE_PROVIDER_IDS.includes(id),
  );
  const mergedOrder = [
    ...ordered,
    ...WATERFALL_PREFERENCE_PROVIDER_IDS.filter((id) => !ordered.includes(id)),
  ];
  return {
    orderedProviders: mergedOrder,
    disabledProviders: disabled,
  };
}

export function readDataProviderPreference(): DataProviderPreference {
  if (typeof window === "undefined") {
    return createDefaultDataProviderPreference();
  }
  try {
    const raw = window.localStorage.getItem(DATA_PROVIDER_PREFERENCE_KEY);
    if (!raw) return createDefaultDataProviderPreference();
    return normalizeDataProviderPreference(JSON.parse(raw) as DataProviderPreference);
  } catch {
    return createDefaultDataProviderPreference();
  }
}

export function writeDataProviderPreference(preference: DataProviderPreference): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeDataProviderPreference(preference);
  try {
    window.localStorage.setItem(DATA_PROVIDER_PREFERENCE_KEY, JSON.stringify(normalized));
    clearChartClientCache();
    notifyDataProviderPreferenceChange(normalized);
    void import("@/lib/userPreferences/userPreferencesSync").then(({ notifyUserPreferencesChanged }) =>
      notifyUserPreferencesChanged(),
    );
  } catch {
    // Ignore quota / privacy mode failures.
  }
}

export { DATA_PROVIDER_PREFERENCE_EVENT };
