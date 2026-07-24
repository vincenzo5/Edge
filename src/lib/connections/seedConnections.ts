import {
  IB_LIVE_CONNECTION_ID,
  IB_PAPER_CONNECTION_ID,
} from "@/lib/trading/connectionRegistry";
import type { Connection } from "./types";

/**
 * Product vocabulary for today's IB Gateway topology.
 * Runtime wiring remains `listIbConnections()` / sidecar — this seed is for Settings IA and Phase 1 UI.
 */
export const SEED_CONNECTIONS: Connection[] = [
  {
    id: IB_PAPER_CONNECTION_ID,
    kind: "ib_gateway_sidecar",
    authKind: "local_gateway",
    broker: "ib",
    environment: "paper",
    displayName: "IB Gateway (Paper)",
    status: "unknown",
  },
  {
    id: IB_LIVE_CONNECTION_ID,
    kind: "ib_gateway_sidecar",
    authKind: "local_gateway",
    broker: "ib",
    environment: "live",
    displayName: "IB Gateway (Live)",
    status: "unknown",
  },
];

export function getSeedConnectionById(id: string): Connection | undefined {
  return SEED_CONNECTIONS.find((connection) => connection.id === id);
}
