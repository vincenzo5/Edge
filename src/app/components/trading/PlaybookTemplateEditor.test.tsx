import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PlaybookTemplateEditor } from "./PlaybookTemplateEditor";
import { BREAK_EVEN_PRESET } from "@/lib/trading/playbook/presets";
import { lockPositionPlan } from "@/lib/trading/playbook/types";

describe("PlaybookTemplateEditor", () => {
  const positionPlan = lockPositionPlan({
    symbol: "AAPL",
    accountId: "DUP586813",
    side: "BUY",
    entry: 100,
    initialStop: 95,
    qty: 10,
    environment: "paper",
  });

  it("shows validation errors for empty name", () => {
    render(
      <PlaybookTemplateEditor
        open
        template={{ ...BREAK_EVEN_PRESET, id: "user_test", name: "My BE" }}
        positionPlan={positionPlan}
        onClose={vi.fn()}
        onSave={vi.fn(async () => {})}
      />,
    );

    fireEvent.change(screen.getByTestId("playbook-template-editor-name"), {
      target: { value: "" },
    });

    expect(screen.getByTestId("playbook-template-editor-errors")).toBeTruthy();
    expect(screen.getByTestId("playbook-template-editor-save")).toBeDisabled();
  });

  it("renders planned step preview when draft is valid", () => {
    render(
      <PlaybookTemplateEditor
        open
        template={{ ...BREAK_EVEN_PRESET, id: "user_test", name: "My BE" }}
        positionPlan={positionPlan}
        onClose={vi.fn()}
        onSave={vi.fn(async () => {})}
      />,
    );

    expect(screen.getByTestId("playbook-template-editor-preview")).toBeTruthy();
    expect(screen.getByTestId("playbook-template-editor-preview").textContent).toMatch(
      /stop to entry/i,
    );
  });

  it("calls onSave with validated template", async () => {
    const onSave = vi.fn(async () => {});
    render(
      <PlaybookTemplateEditor
        open
        template={{ ...BREAK_EVEN_PRESET, id: "user_test", name: "My BE" }}
        positionPlan={positionPlan}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByTestId("playbook-template-editor-save"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user_test",
        name: "My BE",
      }),
    );
  });
});
