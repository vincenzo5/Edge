import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { ManagePlaybookPicker } from "./ManagePlaybookPicker";
import { BREAK_EVEN_PRESET } from "@/lib/trading/playbook/presets";
import { lockPositionPlan } from "@/lib/trading/playbook/types";

const userTemplate = {
  ...BREAK_EVEN_PRESET,
  id: "user_abc123",
  name: "My BE",
};

describe("ManagePlaybookPicker", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/trading/playbooks/templates") && !init?.method) {
          return new Response(
            JSON.stringify({ presets: [BREAK_EVEN_PRESET], userTemplates: [userTemplate] }),
            { status: 200 },
          );
        }
        if (url.includes("/templates/user_abc123") && init?.method === "PATCH") {
          return new Response(JSON.stringify({ template: userTemplate }), { status: 200 });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }),
    );
  });

  it("shows Edit template for user templates only", async () => {
    render(
      <ManagePlaybookPicker
        value="user_abc123"
        onChange={vi.fn()}
        positionPlan={lockPositionPlan({
          symbol: "AAPL",
          accountId: "DUP586813",
          side: "BUY",
          entry: 100,
          initialStop: 95,
          qty: 10,
          environment: "paper",
        })}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("trade-manage-edit-template")).toBeTruthy();
    });
  });

  it("opens editor modal from Edit template action", async () => {
    render(
      <ManagePlaybookPicker
        value="user_abc123"
        onChange={vi.fn()}
        positionPlan={lockPositionPlan({
          symbol: "AAPL",
          accountId: "DUP586813",
          side: "BUY",
          entry: 100,
          initialStop: 95,
          qty: 10,
          environment: "paper",
        })}
      />,
    );

    await waitFor(() => screen.getByTestId("trade-manage-edit-template"));
    fireEvent.click(screen.getByTestId("trade-manage-edit-template"));
    expect(screen.getByTestId("playbook-template-editor")).toBeTruthy();
  });
});
