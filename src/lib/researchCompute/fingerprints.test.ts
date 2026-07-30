import { describe, expect, it } from "vitest";

import {
  computeContentFingerprint,
  computeDatasetId,
  computeIdentityFingerprint,
  computeRunFingerprint,
  normalizeDatasetIdentity,
} from "./fingerprints";

describe("researchCompute fingerprints", () => {
  it("normalizes symbols and produces stable identity fingerprint", () => {
    const identity = normalizeDatasetIdentity({
      symbols: ["aapl", "MSFT", "aapl"],
      interval: "1d",
      fromMs: 1_700_000_000_000,
      toMs: 1_710_000_000_000,
      provider: "auto",
    });
    expect(identity.symbols).toEqual(["AAPL", "MSFT"]);
    const fingerprint = computeIdentityFingerprint(identity);
    expect(fingerprint).toHaveLength(64);
    expect(computeDatasetId(fingerprint)).toMatch(/^ds_/);
  });

  it("hashes content by symbol aggregates", () => {
    const fingerprint = computeContentFingerprint({
      AAPL: [
        { t: 1, o: 1, h: 2, l: 1, c: 1.5, v: 10 },
        { t: 2, o: 1.5, h: 2, l: 1.4, c: 1.6, v: 12 },
      ],
    });
    expect(fingerprint).toHaveLength(64);
  });

  it("includes tool input in run fingerprint", () => {
    const identityFingerprint = "abc";
    const left = computeRunFingerprint({
      datasetId: "ds_1",
      identityFingerprint,
      toolName: "profile_research_dataset",
      toolInput: { rollingWindow: 20 },
    });
    const right = computeRunFingerprint({
      datasetId: "ds_1",
      identityFingerprint,
      toolName: "profile_research_dataset",
      toolInput: { rollingWindow: 30 },
    });
    expect(left).not.toBe(right);
  });
});
