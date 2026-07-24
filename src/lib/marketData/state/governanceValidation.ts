import { listActiveProviders } from "./capabilities";
import { DATASET_CATALOG } from "./catalog";
import { assertActiveCatalogCoverageComplete } from "./coverage";
import {
  API_ROUTE_EXCLUSIONS,
  DATA_ROUTE_REGISTRATIONS,
  DATASET_GOVERNANCE,
} from "./governance";

export type GovernanceValidationInput = {
  apiRoutes: readonly string[];
  providerAdapters: readonly string[];
};

export type GovernanceValidationReport = {
  datasets: number;
  providers: number;
  routes: number;
  exclusions: number;
  issues: string[];
};

export function validateDataStateGovernance(
  input: GovernanceValidationInput,
): GovernanceValidationReport {
  const issues: string[] = [];
  const datasetIds = new Set<string>(DATASET_CATALOG.map((row) => row.datasetId));
  const governanceIds = new Set(Object.keys(DATASET_GOVERNANCE));

  for (const datasetId of datasetIds) {
    if (!governanceIds.has(datasetId)) {
      issues.push(`Dataset "${datasetId}" is missing governance metadata`);
    }
  }
  for (const datasetId of governanceIds) {
    if (!datasetIds.has(datasetId)) {
      issues.push(`Governance metadata references unknown dataset "${datasetId}"`);
    }
  }

  try {
    assertActiveCatalogCoverageComplete();
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "Active catalog coverage is incomplete");
  }

  const registeredRoutes = new Set(Object.keys(DATA_ROUTE_REGISTRATIONS));
  const excludedRoutes = new Set(Object.keys(API_ROUTE_EXCLUSIONS));
  for (const route of input.apiRoutes) {
    const registered = registeredRoutes.has(route);
    const excluded = excludedRoutes.has(route);
    if (!registered && !excluded) {
      issues.push(`API route "${route}" is missing dataset registration or explicit exclusion`);
    }
    if (registered && excluded) {
      issues.push(`API route "${route}" cannot be both registered and excluded`);
    }
  }
  for (const route of [...registeredRoutes, ...excludedRoutes]) {
    if (!input.apiRoutes.includes(route)) {
      issues.push(`Governance references missing API route "${route}"`);
    }
  }

  const activeProviders: string[] = listActiveProviders()
    .map((row) => row.provider)
    .sort();
  const adapters = [...input.providerAdapters].sort();
  for (const provider of activeProviders) {
    if (!adapters.includes(provider)) {
      issues.push(`Active provider "${provider}" is missing an adapter`);
    }
  }
  for (const adapter of adapters) {
    if (!activeProviders.includes(adapter)) {
      issues.push(`Provider adapter "${adapter}" is missing active capability metadata`);
    }
  }

  return {
    datasets: datasetIds.size,
    providers: activeProviders.length,
    routes: registeredRoutes.size,
    exclusions: excludedRoutes.size,
    issues,
  };
}
