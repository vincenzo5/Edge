import { describe, expect, it } from "vitest";
import {
  AuthKindSchema,
  ConnectionSchema,
  DataProviderIdSchema,
  DataProviderPreferenceSchema,
} from "./types";

describe("ConnectionSchema", () => {
  it("accepts a valid ib_gateway_sidecar connection", () => {
    const parsed = ConnectionSchema.safeParse({
      id: "ib-paper",
      kind: "ib_gateway_sidecar",
      authKind: "local_gateway",
      broker: "ib",
      environment: "paper",
      displayName: "IB Gateway (Paper)",
      status: "unknown",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts optional non-secret metadata", () => {
    const parsed = ConnectionSchema.safeParse({
      id: "ib-live",
      kind: "ib_gateway_sidecar",
      authKind: "local_gateway",
      broker: "ib",
      environment: "live",
      displayName: "IB Gateway (Live)",
      status: "configured",
      metadata: { host: "127.0.0.1", port: 4001 },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown connection kinds", () => {
    const parsed = ConnectionSchema.safeParse({
      id: "alpaca-paper",
      kind: "oauth",
      authKind: "oauth",
      broker: "stub",
      environment: "paper",
      displayName: "Alpaca",
      status: "unknown",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("AuthKindSchema", () => {
  it("accepts known auth kinds including future stubs", () => {
    for (const authKind of ["local_gateway", "oauth", "api_token_vault"] as const) {
      expect(AuthKindSchema.safeParse(authKind).success).toBe(true);
    }
  });
});

describe("DataProviderPreferenceSchema", () => {
  it("accepts ordered and disabled provider lists", () => {
    const parsed = DataProviderPreferenceSchema.safeParse({
      orderedProviders: ["tws", "yahoo", "massive"],
      disabledProviders: ["sec"],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown provider ids", () => {
    const parsed = DataProviderPreferenceSchema.safeParse({
      orderedProviders: ["polygon"],
      disabledProviders: [],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("DataProviderIdSchema", () => {
  it("roundtrips all known provider ids", () => {
    for (const id of ["yahoo", "sec", "fred", "fmp", "massive", "ibkr", "tws"] as const) {
      expect(DataProviderIdSchema.safeParse(id).success).toBe(true);
    }
  });
});
