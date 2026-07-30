import "server-only";

import { ParquetReader, ParquetSchema, ParquetWriter } from "@dsnp/parquetjs";

import type { ResearchBar } from "./contracts";
import { ensureParentDir } from "./paths";

const BAR_SCHEMA = new ParquetSchema({
  t: { type: "INT64" },
  o: { type: "DOUBLE" },
  h: { type: "DOUBLE" },
  l: { type: "DOUBLE" },
  c: { type: "DOUBLE" },
  v: { type: "DOUBLE", optional: true },
});

export async function writeBarsParquet(filePath: string, bars: ResearchBar[]): Promise<void> {
  ensureParentDir(filePath);
  const writer = await ParquetWriter.openFile(BAR_SCHEMA, filePath);
  try {
    for (const bar of bars) {
      await writer.appendRow({
        t: BigInt(bar.t),
        o: bar.o,
        h: bar.h,
        l: bar.l,
        c: bar.c,
        v: bar.v ?? null,
      });
    }
  } finally {
    await writer.close();
  }
}

function toNumber(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return Number(value);
}

export async function readBarsParquet(filePath: string): Promise<ResearchBar[]> {
  const reader = await ParquetReader.openFile(filePath);
  try {
    const cursor = reader.getCursor();
    const bars: ResearchBar[] = [];
    let row: Record<string, unknown> | null = null;
    while ((row = (await cursor.next()) as Record<string, unknown> | null)) {
      bars.push({
        t: toNumber(row.t),
        o: toNumber(row.o),
        h: toNumber(row.h),
        l: toNumber(row.l),
        c: toNumber(row.c),
        v: row.v == null ? undefined : toNumber(row.v),
      });
    }
    return bars;
  } finally {
    await reader.close();
  }
}
