import { z } from "zod";

import {
  AuthKindSchema,
  ConnectionKindSchema,
  ConnectionMetadataSchema,
  ConnectionSchema,
  ConnectionStatusSchema,
  PatchConnectionSchema,
} from "@/lib/connections/types";
import { TradingBrokerSchema, TradingEnvironmentSchema } from "@/lib/trading/types";

export { ConnectionSchema, PatchConnectionSchema };

export type ConnectionResponse = z.infer<typeof ConnectionSchema>;

export const connectionsListResponseSchema = z.object({
  connections: z.array(ConnectionSchema),
});

export const connectionActionResponseSchema = z.object({
  ok: z.boolean(),
  connection: ConnectionSchema.optional(),
  message: z.string().optional(),
});

export const connectionRowSchema = z.object({
  userId: z.string().uuid(),
  id: z.string().min(1),
  kind: ConnectionKindSchema,
  authKind: AuthKindSchema,
  broker: TradingBrokerSchema,
  environment: TradingEnvironmentSchema,
  displayName: z.string().min(1),
  status: ConnectionStatusSchema,
  metadata: ConnectionMetadataSchema.optional(),
});
