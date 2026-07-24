import { describe, expect, it } from "vitest";
import { redactDiagnostic, redactDiagnosticList } from "./redactDiagnostic";

describe("redactDiagnostic", () => {
  it("redacts credentials, bearer tokens, account ids, and URL queries", () => {
    const output = redactDiagnostic(
      "api_key=abc123 Authorization: Bearer token.value accountId=DU123456 " +
        "https://user:pass@example.com/quote?token=secret&symbol=AAPL",
    );

    expect(output).not.toMatch(/abc123|token\.value|DU123456|secret|user|pass|AAPL/);
    expect(output).toContain("[REDACTED]");
    expect(output).toContain("https://");
  });

  it("preserves useful failure categories and bounds output", () => {
    expect(redactDiagnostic("IBKR timeout while resolving contract")).toBe(
      "IBKR timeout while resolving contract",
    );
    expect(redactDiagnostic("x".repeat(500), { maxLength: 120 })).toHaveLength(120);
  });

  it("redacts JSON quoted values including spaces and nested provider errors", () => {
    const output = redactDiagnostic({
      provider: "fmp",
      error: {
        message: '"api_key":"secret value", "token": "abc def"',
        accountNumber: "U1234567",
      },
    });

    expect(output).not.toMatch(/secret value|abc def|U1234567/);
    expect(output).toContain("[REDACTED]");
  });

  it("redacts bearer tokens, IB accounts, URLs, and warning lists", () => {
    const warnings = redactDiagnosticList([
      "Authorization: Bearer eyJhbGciOi.secret",
      "accountId=DU7654321",
      "provider failed at https://user:pass@example.com/path?token=top-secret",
    ]);
    const output = warnings.join(" ");

    expect(output).not.toMatch(/eyJhbGciOi|DU7654321|user|pass|top-secret/);
    expect(output).toContain("[REDACTED]");
    expect(warnings).toHaveLength(3);
  });
});
