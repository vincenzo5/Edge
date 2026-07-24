import type { BrokerageSnapshot } from "./brokerageService";
import type { BrokerageSubdatasetInput } from "@/lib/marketData/healthDatasets";

function maxTimestamp(values: Array<number | undefined | null>): number | undefined {
  const nums = values.filter((value): value is number => typeof value === "number");
  if (!nums.length) return undefined;
  return Math.max(...nums);
}

export function buildBrokerageSubdatasetInputs(args: {
  snapshot: BrokerageSnapshot | null | undefined;
  disabled?: boolean;
  ingestDetail?: string | null;
  ingestError?: string | null;
}): BrokerageSubdatasetInput[] {
  if (args.disabled || !args.snapshot) return [];

  const snapshot = args.snapshot;
  const baseStatus = snapshot.status?.connected ? "loaded" : "unavailable";

  const rows: BrokerageSubdatasetInput[] = [
    {
      datasetId: "account_summary",
      detail: snapshot.summary?.accountId ? "Summary loaded" : undefined,
      asOf: snapshot.summary?.updatedAt,
      receivedAt: snapshot.updatedAt,
      status: snapshot.summary ? baseStatus : "unavailable",
    },
    {
      datasetId: "positions",
      detail: `${snapshot.positions.length} positions`,
      asOf: maxTimestamp(snapshot.positions.map((row) => row.updatedAt)),
      receivedAt: snapshot.updatedAt,
      status: baseStatus,
    },
    {
      datasetId: "account_pnl",
      detail: snapshot.pnl ? "PnL loaded" : undefined,
      asOf: snapshot.pnl?.updatedAt,
      receivedAt: snapshot.updatedAt,
      status: snapshot.pnl ? baseStatus : "not_loaded",
    },
    {
      datasetId: "orders",
      detail: `${snapshot.orders.length} orders`,
      asOf: maxTimestamp(snapshot.orders.map((row) => row.updatedAt)),
      receivedAt: snapshot.updatedAt,
      status: baseStatus,
    },
    {
      datasetId: "executions_fills",
      detail: `${snapshot.executions.length} fills`,
      asOf: maxTimestamp(snapshot.executions.map((row) => row.updatedAt)),
      receivedAt: snapshot.updatedAt,
      status: baseStatus,
    },
    {
      datasetId: "broker_ledger_ingest",
      detail: args.ingestDetail ?? undefined,
      receivedAt: snapshot.updatedAt,
      status: args.ingestError ? "unavailable" : args.ingestDetail ? "loaded" : "not_loaded",
      warnings: args.ingestError ? [args.ingestError] : [],
    },
  ];

  return rows;
}
