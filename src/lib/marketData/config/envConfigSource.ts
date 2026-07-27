import type { ConfigSource } from "./types";

function trimValue(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Static process.env member access so Next.js standalone/server bundles keep
 * runtime bindings. Dynamic `process.env[key]` alone is omitted from the
 * production env polyfill when a key is never referenced statically.
 */
const STATIC_ENV_READERS: Record<string, () => string | undefined> = {
  TWS_ENABLED: () => process.env.TWS_ENABLED,
  TWS_SIDECAR_URL: () => process.env.TWS_SIDECAR_URL,
  TWS_SIDECAR_PORT: () => process.env.TWS_SIDECAR_PORT,
  TWS_SIDECAR_SECRET: () => process.env.TWS_SIDECAR_SECRET,
  TWS_SIDECAR_TIMEOUT_MS: () => process.env.TWS_SIDECAR_TIMEOUT_MS,
  TWS_CANDLES_TIMEOUT_MS: () => process.env.TWS_CANDLES_TIMEOUT_MS,
  TWS_QUOTES_TIMEOUT_MS: () => process.env.TWS_QUOTES_TIMEOUT_MS,
  TWS_OPTIONS_TIMEOUT_MS: () => process.env.TWS_OPTIONS_TIMEOUT_MS,
  TWS_MANAGED: () => process.env.TWS_MANAGED,
  MASSIVE_API_KEY: () => process.env.MASSIVE_API_KEY,
  POLYGON_API_KEY: () => process.env.POLYGON_API_KEY,
  MASSIVE_BASE_URL: () => process.env.MASSIVE_BASE_URL,
  FMP_API_KEY: () => process.env.FMP_API_KEY,
  FRED_API_KEY: () => process.env.FRED_API_KEY,
  SEC_USER_AGENT: () => process.env.SEC_USER_AGENT,
  IBKR_ENABLED: () => process.env.IBKR_ENABLED,
  IBKR_BASE_URL: () => process.env.IBKR_BASE_URL,
  IBKR_SSL_VERIFY: () => process.env.IBKR_SSL_VERIFY,
  IBKR_READ_ONLY: () => process.env.IBKR_READ_ONLY,
  IBKR_COMPETE_SESSION: () => process.env.IBKR_COMPETE_SESSION,
};

export class EnvConfigSource implements ConfigSource {
  get(key: string): string | undefined {
    const reader = STATIC_ENV_READERS[key];
    if (reader) {
      return trimValue(reader());
    }
    return trimValue(process.env[key]);
  }

  isSet(key: string): boolean {
    return this.get(key) !== undefined;
  }
}
