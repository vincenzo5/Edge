import type {
  AccountExecution,
  AccountOrder,
  AccountPnL,
  AccountPosition,
  AccountStatus,
  AccountSummary,
} from "@/lib/marketData/contracts/brokerage";

export type AccountConnectionState =
  | "disabled"
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type AccountSnapshot = {
  connectionState: AccountConnectionState;
  disabled: boolean;
  error: string | null;
  status: AccountStatus | null;
  summary: AccountSummary | null;
  positions: AccountPosition[];
  pnl: AccountPnL | null;
  orders: AccountOrder[];
  executions: AccountExecution[];
  updatedAt: number | null;
};

export type AccountSnapshotPayload = Pick<
  AccountSnapshot,
  "status" | "summary" | "positions" | "pnl" | "orders" | "executions"
>;

export function buildAccountSnapshot(
  connectionState: AccountConnectionState,
  disabled: boolean,
  error: string | null,
  payload: AccountSnapshotPayload,
): AccountSnapshot {
  const timestamps = [
    payload.summary?.updatedAt,
    payload.pnl?.updatedAt,
    ...payload.positions.map((row) => row.updatedAt),
    ...payload.orders.map((row) => row.updatedAt),
    ...payload.executions.map((row) => row.updatedAt),
  ].filter((value): value is number => typeof value === "number");

  return {
    connectionState,
    disabled,
    error,
    status: payload.status ?? null,
    summary: payload.summary ?? null,
    positions: payload.positions ?? [],
    pnl: payload.pnl ?? null,
    orders: payload.orders ?? [],
    executions: payload.executions ?? [],
    updatedAt: timestamps.length > 0 ? Math.max(...timestamps) : null,
  };
}
