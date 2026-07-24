import { describe, expect, it } from "vitest";
import {
  buildTradeIdRemap,
  remapAttachmentTradeId,
} from "@/lib/journal/preserveTradeAttachments";

describe("preserveTradeAttachments", () => {
  it("maps previous trade ids to rebuilt ids by fillExecIds key", () => {
    const previous = [
      { id: "old-1", fillExecIds: ["b", "a"] },
      { id: "old-2", fillExecIds: ["c"] },
    ];
    const next = [
      { id: "new-1", fillExecIds: ["a", "b"] },
      { id: "new-2", fillExecIds: ["c"] },
    ];

    const remap = buildTradeIdRemap(previous, next);
    expect(remapAttachmentTradeId("old-1", remap)).toBe("new-1");
    expect(remapAttachmentTradeId("old-2", remap)).toBe("new-2");
    expect(remapAttachmentTradeId("missing", remap)).toBeNull();
  });

  it("keeps identity when rebuild preserves the same trade id", () => {
    const previous = [{ id: "same-id", fillExecIds: ["x", "y"] }];
    const next = [{ id: "same-id", fillExecIds: ["y", "x"] }];
    const remap = buildTradeIdRemap(previous, next);
    expect(remapAttachmentTradeId("same-id", remap)).toBe("same-id");
  });

  it("drops attachments when the fill set no longer maps to a trade", () => {
    const previous = [{ id: "gone", fillExecIds: ["only-old"] }];
    const next = [{ id: "other", fillExecIds: ["only-new"] }];
    const remap = buildTradeIdRemap(previous, next);
    expect(remapAttachmentTradeId("gone", remap)).toBeNull();
  });

  it("maps an open trade to its later fill-set when fills are added", () => {
    const previous = [{ id: "open-trade", fillExecIds: ["buy-1", "buy-2"] }];
    const next = [{ id: "provisional", fillExecIds: ["buy-1", "buy-2", "buy-3"] }];
    const remap = buildTradeIdRemap(previous, next);
    expect(remapAttachmentTradeId("open-trade", remap)).toBe("provisional");
  });
});
