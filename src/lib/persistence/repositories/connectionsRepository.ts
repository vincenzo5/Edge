import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { connections } from "@/db/schema";
import { SEED_CONNECTIONS } from "@/lib/connections/seedConnections";
import type { Connection, PatchConnectionInput } from "@/lib/connections/types";
import {
  ConnectionMetadataSchema,
  ConnectionStatusSchema,
} from "@/lib/connections/types";
import type { ConnectionResponse } from "@/lib/persistence/schemas/connections";
import { listIbConnections } from "@/lib/trading/connectionRegistry";

function parseMetadata(value: unknown): Connection["metadata"] {
  if (!value || typeof value !== "object") return undefined;
  const parsed = ConnectionMetadataSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function rowToConnection(row: typeof connections.$inferSelect): ConnectionResponse {
  return {
    id: row.id,
    kind: row.kind as Connection["kind"],
    authKind: row.authKind as Connection["authKind"],
    broker: row.broker as Connection["broker"],
    environment: row.environment as Connection["environment"],
    displayName: row.displayName,
    status: ConnectionStatusSchema.parse(row.status),
    metadata: parseMetadata(row.metadata),
  };
}

function runtimeMetadataForSeed(connectionId: string): Connection["metadata"] {
  const runtime = listIbConnections().find((row) => row.connectionId === connectionId);
  if (!runtime) return undefined;
  return { host: runtime.host, port: runtime.port };
}

export async function ensureSeededConnections(userId: string): Promise<void> {
  const db = getDb();
  const existing = await db
    .select({ id: connections.id })
    .from(connections)
    .where(eq(connections.userId, userId));
  const existingIds = new Set(existing.map((row) => row.id));

  for (const seed of SEED_CONNECTIONS) {
    if (existingIds.has(seed.id)) continue;
    await db.insert(connections).values({
      userId,
      id: seed.id,
      kind: seed.kind,
      authKind: seed.authKind,
      broker: seed.broker,
      environment: seed.environment,
      displayName: seed.displayName,
      status: seed.status,
      metadata: runtimeMetadataForSeed(seed.id) ?? {},
    });
  }
}

export async function listConnections(userId: string): Promise<ConnectionResponse[]> {
  await ensureSeededConnections(userId);
  const db = getDb();
  const rows = await db
    .select()
    .from(connections)
    .where(eq(connections.userId, userId))
    .orderBy(asc(connections.environment), asc(connections.id));
  return rows.map(rowToConnection);
}

export async function getConnection(
  userId: string,
  connectionId: string,
): Promise<ConnectionResponse | null> {
  await ensureSeededConnections(userId);
  const db = getDb();
  const rows = await db
    .select()
    .from(connections)
    .where(and(eq(connections.userId, userId), eq(connections.id, connectionId)))
    .limit(1);
  const row = rows[0];
  return row ? rowToConnection(row) : null;
}

export async function updateConnection(
  userId: string,
  connectionId: string,
  patch: PatchConnectionInput,
): Promise<ConnectionResponse | null> {
  await ensureSeededConnections(userId);
  const db = getDb();
  const rows = await db
    .update(connections)
    .set({
      ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(connections.userId, userId), eq(connections.id, connectionId)))
    .returning();
  const row = rows[0];
  return row ? rowToConnection(row) : null;
}

export async function disconnectConnection(
  userId: string,
  connectionId: string,
): Promise<ConnectionResponse | null> {
  return updateConnection(userId, connectionId, { status: "disconnected" });
}
