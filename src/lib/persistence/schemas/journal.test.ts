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

  it("validates trade patch with ignored flag", () => {
    const parsed = journalTradePatchSchema.safeParse({ ignored: true });
    expect(parsed.success).toBe(true);
  });

  it("validates trade patch with initialStop", () => {
    const parsed = journalTradePatchSchema.safeParse({ initialStop: 12.1 });
    expect(parsed.success).toBe(true);
  });

  it("validates trade patch clearing initialStop", () => {
    const parsed = journalTradePatchSchema.safeParse({ initialStop: null });
    expect(parsed.success).toBe(true);
  });

  it("accepts custom setup labels within bounds", () => {
    const parsed = journalTradePatchSchema.safeParse({ setup: "VWAP reclaim" });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty setup labels", () => {
    const parsed = journalTradePatchSchema.safeParse({ setup: "   " });
    expect(parsed.success).toBe(false);
  });
});
