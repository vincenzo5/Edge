/** Canonical env key names for market-data provider configuration. */

export const MASSIVE_KEYS = {
  apiKey: "MASSIVE_API_KEY",
  legacyApiKey: "POLYGON_API_KEY",
  baseUrl: "MASSIVE_BASE_URL",
} as const;

export const FMP_KEYS = {
  apiKey: "FMP_API_KEY",
} as const;

export const FRED_KEYS = {
  apiKey: "FRED_API_KEY",
} as const;

export const SEC_KEYS = {
  userAgent: "SEC_USER_AGENT",
} as const;

export const TWS_KEYS = {
  enabled: "TWS_ENABLED",
  sidecarUrl: "TWS_SIDECAR_URL",
  sidecarPort: "TWS_SIDECAR_PORT",
  sidecarSecret: "TWS_SIDECAR_SECRET",
  sidecarTimeoutMs: "TWS_SIDECAR_TIMEOUT_MS",
  candlesTimeoutMs: "TWS_CANDLES_TIMEOUT_MS",
  quotesTimeoutMs: "TWS_QUOTES_TIMEOUT_MS",
  optionsTimeoutMs: "TWS_OPTIONS_TIMEOUT_MS",
  managed: "TWS_MANAGED",
} as const;

export const IBKR_KEYS = {
  enabled: "IBKR_ENABLED",
  baseUrl: "IBKR_BASE_URL",
  sslVerify: "IBKR_SSL_VERIFY",
  readOnly: "IBKR_READ_ONLY",
  competeSession: "IBKR_COMPETE_SESSION",
} as const;

/** Default values when keys are unset but provider is still usable. */
export const CONFIG_DEFAULTS = {
  massiveBaseUrl: "https://api.massive.com",
  ibkrBaseUrl: "https://localhost:5000/v1/api",
  twsSidecarUrl: "http://127.0.0.1:8765",
  secUserAgent: "EdgeChart/1.0 (contact@example.com)",
} as const;
