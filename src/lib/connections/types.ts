import { z } from "zod";
import { TradingBrokerSchema, TradingEnvironmentSchema } from "@/lib/trading/types";

/** Known production data providers in Edge (mirrors marketData/contracts/result.ts). */
export const DataProviderIdSchema = z.enum([
  "yahoo",
  "sec",
  "fred",
  "fmp",
  "massive",
  "ibkr",
  "tws",
]);
export type DataProviderId = z.infer<typeof DataProviderIdSchema>;

/** How a broker connection is hosted/authenticated. Phase 0 ships ib_gateway_sidecar only. */
export const ConnectionKindSchema = z.enum(["ib_gateway_sidecar"]);
export type ConnectionKind = z.infer<typeof ConnectionKindSchema>;

/** How credentials are obtained for a connection. OAuth/token vault are Phase 5+ stubs. */
export const AuthKindSchema = z.enum(["local_gateway", "oauth", "api_token_vault"]);
export type AuthKind = z.infer<typeof AuthKindSchema>;

export const ConnectionStatusSchema = z.enum([
  "unknown",
  "configured",
  "connected",
  "degraded",
  "disconnected",
]);
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

/** Non-secret connection metadata only — never credentials or tokens. */
export const ConnectionMetadataSchema = z.object({
  host: z.string().optional(),
  port: z.number().int().positive().optional(),
});
export type ConnectionMetadata = z.infer<typeof ConnectionMetadataSchema>;

/** Product Connection record — durable identity for Settings and header pickers (Phase 4+). */
export const ConnectionSchema = z.object({
  id: z.string().min(1),
  kind: ConnectionKindSchema,
  authKind: AuthKindSchema,
  broker: TradingBrokerSchema,
  environment: TradingEnvironmentSchema,
  displayName: z.string().min(1),
  status: ConnectionStatusSchema,
  metadata: ConnectionMetadataSchema.optional(),
});
export type Connection = z.infer<typeof ConnectionSchema>;

export const PatchConnectionSchema = z
  .object({
    displayName: z.string().min(1).optional(),
    status: ConnectionStatusSchema.optional(),
    metadata: ConnectionMetadataSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });
export type PatchConnectionInput = z.infer<typeof PatchConnectionSchema>;

/**
 * User/operator preference for display-data provider waterfall order (Phase 2+).
 * Distinct from `ProviderPreferences` in marketData/router/dataRouter.ts (static domain defaults).
 */
export const DataProviderPreferenceSchema = z.object({
  orderedProviders: z.array(DataProviderIdSchema),
  disabledProviders: z.array(DataProviderIdSchema),
});
export type DataProviderPreference = z.infer<typeof DataProviderPreferenceSchema>;
