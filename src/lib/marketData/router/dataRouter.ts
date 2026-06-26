import type { DataProviderId } from "../contracts/result";

export type ProviderPreferences = {
  equity?: DataProviderId;
  fundamentals?: DataProviderId;
  options?: DataProviderId;
  events?: DataProviderId;
  news?: DataProviderId;
  macro?: DataProviderId;
  sec?: DataProviderId;
};

export const DEFAULT_PROVIDER_PREFERENCES: ProviderPreferences = {
  equity: "yahoo",
  fundamentals: "yahoo",
  options: "tradier",
  events: "fmp",
  news: "fmp",
  macro: "fred",
  sec: "sec",
};

export function resolveProvider(
  domain: keyof ProviderPreferences,
  preferences: ProviderPreferences = DEFAULT_PROVIDER_PREFERENCES,
): DataProviderId {
  return preferences[domain] ?? DEFAULT_PROVIDER_PREFERENCES[domain] ?? "yahoo";
}
