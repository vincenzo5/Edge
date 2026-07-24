import { describe, expect, it } from "vitest";
import { providerSupports } from "./providerCapabilities";
import { DEFAULT_PROVIDER_CAPABILITIES } from "../state/capabilities";

describe("providerCapabilities compatibility shim", () => {
  it("re-exports regenerated capability map through router path", () => {
    expect(providerSupports("massive", "options_chain")).toBe(true);
    expect(providerSupports("fmp", "screener")).toBe(true);
    expect(DEFAULT_PROVIDER_CAPABILITIES.ibkr).toContain("equity_quotes");
  });
});
