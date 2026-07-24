import { describe, expect, it, vi } from "vitest";
import { createFetchJournalPort } from "./journalPort";

describe("createFetchJournalPort", () => {
  it("returns a port with list, get, and patch methods", () => {
    const port = createFetchJournalPort();
    expect(typeof port.listTrades).toBe("function");
    expect(typeof port.getTrade).toBe("function");
    expect(typeof port.patchTrade).toBe("function");
  });
});
