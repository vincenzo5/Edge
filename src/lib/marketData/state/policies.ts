import type { DatasetKind } from "../trust/dataTrust";
import { getDatasetPolicy } from "../trust/dataTrust";
import {
  DATASET_CATALOG,
  datasetIdToPolicyKind,
  getDatasetDefinition,
  lookupDataset,
  type DatasetId,
  type FreshnessPolicyRef,
} from "./catalog";

export type PolicyRegistration = {
  datasetId: DatasetId;
  policyKind?: DatasetKind;
  hasPolicyRow: boolean;
  freshnessGap?: string;
};

export function getPolicyRegistration(datasetId: DatasetId): PolicyRegistration {
  const definition = getDatasetDefinition(datasetId);
  const policyKind = definition.policyKind;
  return {
    datasetId,
    policyKind,
    hasPolicyRow: policyKind != null,
    freshnessGap:
      definition.freshnessPolicy.kind === "gap"
        ? definition.freshnessPolicy.reason
        : undefined,
  };
}

export function resolvePolicyKindForDatasetId(
  datasetId: DatasetId | string,
): DatasetKind | undefined {
  const row = lookupDataset(datasetId);
  if (!row) return undefined;
  return row.policyKind;
}

export function resolveEffectiveFreshnessPolicy(
  datasetId: DatasetId,
): FreshnessPolicyRef {
  const definition = getDatasetDefinition(datasetId);
  const ref = definition.freshnessPolicy;
  if (ref.kind === "inherits") {
    return resolveEffectiveFreshnessPolicy(ref.datasetId);
  }
  if (ref.kind === "ttl" && ref.namespace === "context") {
    return { kind: "ttl", namespace: "market_context" };
  }
  return ref;
}

export function listCatalogPolicyGaps(): PolicyRegistration[] {
  return DATASET_CATALOG.map((row) => getPolicyRegistration(row.datasetId)).filter(
    (row) => row.freshnessGap != null,
  );
}

export function hasTrustPolicy(datasetId: DatasetId): boolean {
  const kind = datasetIdToPolicyKind(datasetId);
  if (!kind) return false;
  return Boolean(getDatasetPolicy(kind));
}
