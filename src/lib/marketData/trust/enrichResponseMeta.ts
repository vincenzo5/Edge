import type { DataResult } from "../contracts/result";
import { dataResultToResponseMeta, type DataResponseMeta } from "../contracts/result";
import {
  buildTrustMeta,
  type DataUsage,
  type DatasetKind,
  provenanceFromDataResult,
} from "./dataTrust";

export function enrichResponseMetaWithTrust<T>(
  result: DataResult<T>,
  dataset: DatasetKind,
  usage: DataUsage,
): DataResponseMeta {
  const base = dataResultToResponseMeta(result);
  const trust = buildTrustMeta(dataset, usage, provenanceFromDataResult(result));
  return {
    ...base,
    usage: trust.usage,
    readiness: trust.readiness,
  };
}
