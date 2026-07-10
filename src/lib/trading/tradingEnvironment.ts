import type { TradingEnvironment } from "./types";

export const TRADING_ENVIRONMENT_KEY = "edge:trading:environment";

export function readTradingEnvironment(): TradingEnvironment {
  if (typeof window === "undefined") return "paper";
  try {
    const raw = window.localStorage.getItem(TRADING_ENVIRONMENT_KEY);
    if (raw === "live") return "live";
    return "paper";
  } catch {
    return "paper";
  }
}

export function writeTradingEnvironment(environment: TradingEnvironment): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRADING_ENVIRONMENT_KEY, environment);
}
