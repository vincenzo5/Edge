import { describe, expect, it } from "vitest";
import {
  isFmpOnlySavedScreen,
  isSavedScreenDisabledByProviderRestriction,
  isScreenerProviderRestrictionWarning,
  screenerHasProviderRestriction,
} from "./providerWarnings";
import type { SavedScreen } from "./types";

describe("providerWarnings", () => {
  it("matches FMP 403 and suspended warnings", () => {
    expect(
      isScreenerProviderRestrictionWarning(
        "FMP endpoint restricted (403): account suspended",
      ),
    ).toBe(true);
    expect(isScreenerProviderRestrictionWarning("FMP_API_KEY is not configured")).toBe(true);
    expect(isScreenerProviderRestrictionWarning("FMP endpoint restricted (402): plan required")).toBe(
      true,
    );
  });

  it("does not match unrelated provider notices", () => {
    expect(
      isScreenerProviderRestrictionWarning(
        "Massive plan restricted (403): current-day data unavailable before market close on this tier.",
      ),
    ).toBe(false);
    expect(isScreenerProviderRestrictionWarning("Truncated technical pass to 200 candidates")).toBe(
      false,
    );
  });

  it("aggregates restriction warnings", () => {
    expect(screenerHasProviderRestriction([])).toBe(false);
    expect(
      screenerHasProviderRestriction([
        "Truncated technical pass to 200 candidates",
        "FMP endpoint restricted (403): suspended",
      ]),
    ).toBe(true);
  });

  it("classifies FMP-only saved screens", () => {
    const movers: SavedScreen = {
      id: "gainers",
      name: "Gainers",
      kind: "movers",
      moverKind: "gainers",
      columns: ["symbol"],
      createdAt: 1,
      updatedAt: 1,
    };
    const descriptive: SavedScreen = {
      id: "liquid",
      name: "Liquid",
      kind: "screener",
      query: { price: { min: 5 }, limit: 200 },
      columns: ["symbol"],
      createdAt: 1,
      updatedAt: 1,
    };
    const technical: SavedScreen = {
      id: "rsi",
      name: "RSI",
      kind: "screener",
      query: {
        volume: { min: 500_000 },
        technical: { kind: "rsi", period: 14, max: 30 },
        limit: 200,
      },
      columns: ["symbol"],
      createdAt: 1,
      updatedAt: 1,
    };

    expect(isFmpOnlySavedScreen(movers)).toBe(true);
    expect(isFmpOnlySavedScreen(descriptive)).toBe(true);
    expect(isFmpOnlySavedScreen(technical)).toBe(false);
  });

  it("disables only FMP-only screens when restriction warnings are present", () => {
    const warnings = ["FMP endpoint restricted (403): suspended"];
    const movers: SavedScreen = {
      id: "gainers",
      name: "Gainers",
      kind: "movers",
      moverKind: "gainers",
      columns: ["symbol"],
      createdAt: 1,
      updatedAt: 1,
    };
    const technical: SavedScreen = {
      id: "rsi",
      name: "RSI",
      kind: "screener",
      query: {
        technical: { kind: "rsi", period: 14, max: 30 },
        limit: 200,
      },
      columns: ["symbol"],
      createdAt: 1,
      updatedAt: 1,
    };

    expect(isSavedScreenDisabledByProviderRestriction(movers, warnings)).toBe(true);
    expect(isSavedScreenDisabledByProviderRestriction(technical, warnings)).toBe(false);
  });
});
