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
    localStorage.clear();
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

  it("lists user policies only", async () => {
    render(<RiskPoliciesSection />);
    await waitFor(() => {
      expect(screen.getByTestId("risk-policy-row-user_abc123")).toBeTruthy();
    });
    expect(screen.queryByTestId("risk-policy-row-break_even")).toBeNull();
  });

  it("opens editable editor when editing a user policy", async () => {
    render(<RiskPoliciesSection />);
    await waitFor(() => screen.getByTestId("risk-policy-edit-user_abc123"));
    fireEvent.click(screen.getByTestId("risk-policy-edit-user_abc123"));
    expect(screen.getByTestId("playbook-template-editor")).toBeTruthy();
    expect(screen.getByTestId("playbook-template-editor-save")).toBeTruthy();
  });

  it("opens read-only editor when viewing a user policy", async () => {
    render(<RiskPoliciesSection />);
    await waitFor(() => screen.getByTestId("risk-policy-view-user_abc123"));
    fireEvent.click(screen.getByTestId("risk-policy-view-user_abc123"));
    expect(screen.getByTestId("playbook-template-editor")).toBeTruthy();
    expect(screen.queryByTestId("playbook-template-editor-save")).toBeNull();
  });

  it("duplicates a user policy", async () => {
    render(<RiskPoliciesSection />);
    await waitFor(() => screen.getByTestId("risk-policy-duplicate-user_abc123"));
    fireEvent.click(screen.getByTestId("risk-policy-duplicate-user_abc123"));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/trading/playbooks/templates/user_abc123/duplicate",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("renders default policy pickers", async () => {
    render(<RiskPoliciesSection />);
    await waitFor(() => {
      expect(screen.getByTestId("risk-policy-defaults")).toBeTruthy();
    });
    expect(screen.getByText("Default policy")).toBeTruthy();
    expect(screen.getByTestId("risk-policy-default-long")).toBeTruthy();
    expect(screen.getByTestId("risk-policy-default-short")).toBeTruthy();
  });

  it("shows empty state when there are no user policies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ presets: [BREAK_EVEN_PRESET], userTemplates: [] }),
          { status: 200 },
        ),
      ),
    );
    render(<RiskPoliciesSection />);
    await waitFor(() => {
      expect(screen.getByText("No policies yet.")).toBeTruthy();
    });
    expect(screen.queryByTestId("risk-policy-row-break_even")).toBeNull();
  });
});
