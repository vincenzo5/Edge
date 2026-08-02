import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { RiskPoliciesSection } from "./RiskPoliciesSection";
import { BREAK_EVEN_PRESET } from "@/lib/trading/playbook/presets";

const userTemplate = {
  ...BREAK_EVEN_PRESET,
  id: "user_abc123",
  name: "My policy",
};

describe("RiskPoliciesSection", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.endsWith("/api/trading/playbooks/templates") && !url.includes("/duplicate")) {
          return new Response(
            JSON.stringify({ presets: [BREAK_EVEN_PRESET], userTemplates: [userTemplate] }),
            { status: 200 },
          );
        }
        if (url.includes("/duplicate")) {
          return new Response(
            JSON.stringify({ template: { ...userTemplate, id: "user_dup", name: "My policy (copy)" } }),
            { status: 200 },
          );
        }
        if (url.includes("/templates/user_abc123") && !url.includes("duplicate")) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
      }),
    );
  });

  it("lists built-in and user policies", async () => {
    render(<RiskPoliciesSection />);
    await waitFor(() => {
      expect(screen.getByTestId("risk-policy-row-break_even")).toBeTruthy();
      expect(screen.getByTestId("risk-policy-row-user_abc123")).toBeTruthy();
    });
  });

  it("opens read-only editor for built-in policy", async () => {
    render(<RiskPoliciesSection />);
    await waitFor(() => screen.getByTestId("risk-policy-open-break_even"));
    fireEvent.click(screen.getByTestId("risk-policy-open-break_even"));
    expect(screen.getByTestId("playbook-template-editor")).toBeTruthy();
    expect(screen.queryByTestId("playbook-template-editor-save")).toBeNull();
  });

  it("duplicates a built-in policy", async () => {
    render(<RiskPoliciesSection />);
    await waitFor(() => screen.getByTestId("risk-policy-duplicate-break_even"));
    fireEvent.click(screen.getByTestId("risk-policy-duplicate-break_even"));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/trading/playbooks/templates/break_even/duplicate",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
