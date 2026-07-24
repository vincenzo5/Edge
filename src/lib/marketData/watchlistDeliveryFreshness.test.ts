import { describe, expect, it } from "vitest";
import {
  closedMarketHealthySubtitle,
  resolveWatchlistRestPollIntervalMs,
  WATCHLIST_REST_POLL_CLOSED_MS,
  WATCHLIST_REST_POLL_OPEN_MS,
} from "./watchlistDeliveryFreshness";

describe("watchlistDeliveryFreshness", () => {
  it("uses shorter poll interval during open sessions", () => {
    expect(resolveWatchlistRestPollIntervalMs("regular")).toBe(WATCHLIST_REST_POLL_OPEN_MS);
    expect(resolveWatchlistRestPollIntervalMs("preMarket")).toBe(WATCHLIST_REST_POLL_OPEN_MS);
    expect(resolveWatchlistRestPollIntervalMs("postMarket")).toBe(WATCHLIST_REST_POLL_OPEN_MS);
  });

  it("uses longer poll interval when market is closed", () => {
    expect(resolveWatchlistRestPollIntervalMs("closed")).toBe(WATCHLIST_REST_POLL_CLOSED_MS);
  });

  it("returns neutral closed-market copy", () => {
    expect(closedMarketHealthySubtitle()).toBe("Market closed · quotes current");
  });
});
