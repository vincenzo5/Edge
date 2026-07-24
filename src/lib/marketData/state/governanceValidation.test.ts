import { describe, expect, it } from "vitest";
import { listActiveProviders } from "./capabilities";
import {
  API_ROUTE_EXCLUSIONS,
  DATA_ROUTE_REGISTRATIONS,
} from "./governance";
import { validateDataStateGovernance } from "./governanceValidation";

const allRoutes = [
  ...Object.keys(DATA_ROUTE_REGISTRATIONS),
  ...Object.keys(API_ROUTE_EXCLUSIONS),
];
const activeAdapters = listActiveProviders().map((row) => row.provider);

describe("data-state governance validation", () => {
  it("accepts the complete executable onboarding registry", () => {
    const report = validateDataStateGovernance({
      apiRoutes: allRoutes,
      providerAdapters: activeAdapters,
    });
    expect(report).toMatchObject({
      datasets: 44,
      providers: 7,
      routes: 66,
      exclusions: 12,
      issues: [],
    });
  });

  it("rejects unclassified routes and provider adapters", () => {
    const report = validateDataStateGovernance({
      apiRoutes: [...allRoutes, "market-data/new-provider/route.ts"],
      providerAdapters: [...activeAdapters, "new-provider"],
    });
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("new-provider/route.ts"),
        expect.stringContaining('adapter "new-provider"'),
      ]),
    );
  });
});
