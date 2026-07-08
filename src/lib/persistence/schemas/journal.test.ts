import { describe, expect, it } from "vitest";

import { journalFillBatchSchema, journalTradePatchSchema } from "@/lib/persistence/schemas/journal";

describe("journal schemas", () => {
  it("validates fill batch", () => {
    const parsed = journalFillBatchSchema.safeParse({
      fills: [
        {
          execId: "e1",
          fillTime: "2026-06-01T13:30:00.000Z",
          side: "BOT",
          quantity: 1,
          price: 100,
          contract: { symbol: "AAPL", secType: "STK" },
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("validates trade patch with planned risk", () => {
    const parsed = journalTradePatchSchema.safeParse({
      plannedRiskMode: "usd",
      plannedRiskValue: 500,
    });
    expect(parsed.success).toBe(true);
  });
});
