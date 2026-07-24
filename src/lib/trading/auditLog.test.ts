import { describe, expect, it, beforeEach } from "vitest";
import { appendAudit, listAudit, resetAuditLogForTests } from "./auditLog";
import { runWithRequestId } from "@/lib/observability/requestIdContext";

describe("auditLog", () => {
  beforeEach(() => {
    resetAuditLogForTests();
  });

  it("appends audit entries", () => {
    appendAudit({
      action: "preview",
      outcome: "success",
      accountId: "DUP586813",
      intentId: "intent-1",
    });
    const entries = listAudit();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe("preview");
    expect(entries[0]?.accountId).toBe("DUP586813");
  });

  it("caps ring buffer at 500 entries", () => {
    for (let i = 0; i < 510; i += 1) {
      appendAudit({
        action: "submit",
        outcome: "success",
        detail: String(i),
      });
    }
    expect(listAudit()).toHaveLength(500);
    expect(listAudit()[0]?.detail).toBe("10");
  });

  it("includes requestId from ALS when present", () => {
    runWithRequestId("audit-req-1", () => {
      appendAudit({
        action: "blocked",
        outcome: "blocked",
        detail: "missing session",
      });
    });
    expect(listAudit()[0]?.requestId).toBe("audit-req-1");
  });
});
