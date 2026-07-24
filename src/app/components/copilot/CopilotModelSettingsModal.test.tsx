import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CopilotModelSettingsModal } from "./CopilotModelSettingsModal";
import { ENABLED_MODELS_STORAGE_KEY } from "@/lib/ai/model/enabledModelsStore";

function mockCatalog(popular: Array<{ id: string; label: string }>, recent: Array<{ id: string; label: string }> = []) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ popular, recent }), { status: 200 }),
    ),
  );
}

async function waitForReady() {
  await waitFor(() => {
    expect(screen.getByTestId("copilot-model-settings-sections")).toBeTruthy();
  });
}

describe("CopilotModelSettingsModal", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("loads catalog sections and shows seed models as checked", async () => {
    mockCatalog(
      [{ id: "openai/gpt-5.6-sol", label: "GPT-5.6 Sol", tools: true }],
      [{ id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", tools: true }],
    );

    render(<CopilotModelSettingsModal open onClose={vi.fn()} />);

    await waitForReady();

    expect(screen.getByTestId("copilot-model-toggle-openai--gpt-5.6-sol")).toBeTruthy();
    expect(screen.getByLabelText("GPT-5.6 Sol") as HTMLInputElement).toHaveProperty("checked", true);

    fireEvent.click(screen.getByRole("tab", { name: "Recent" }));
    expect(screen.getByLabelText("Llama 3.3 70B") as HTMLInputElement).toHaveProperty("checked", false);
  });

  it("persists enabled model toggles immediately", async () => {
    mockCatalog([{ id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", tools: true }]);

    render(<CopilotModelSettingsModal open onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Llama 3.3 70B")).toBeTruthy();
    });

    fireEvent.click(screen.getByLabelText("Llama 3.3 70B"));

    const stored = JSON.parse(window.localStorage.getItem(ENABLED_MODELS_STORAGE_KEY) ?? "{}") as {
      modelIds: string[];
    };
    expect(stored.modelIds).toContain("meta-llama/llama-3.3-70b-instruct");
  });

  it("resets enabled models to seed defaults", async () => {
    window.localStorage.setItem(
      ENABLED_MODELS_STORAGE_KEY,
      JSON.stringify({ modelIds: ["meta-llama/llama-3.3-70b-instruct"] }),
    );

    mockCatalog([{ id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", tools: true }]);

    render(<CopilotModelSettingsModal open onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("copilot-model-settings-reset")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("copilot-model-settings-reset"));

    const stored = JSON.parse(window.localStorage.getItem(ENABLED_MODELS_STORAGE_KEY) ?? "{}") as {
      modelIds: string[];
    };
    expect(stored.modelIds).toContain("x-ai/grok-4.5");
    expect(stored.modelIds.length).toBeGreaterThan(1);
  });

  it("filters models by search query", async () => {
    mockCatalog(
      [
        { id: "openai/gpt-5.6-sol", label: "GPT-5.6 Sol", tools: true },
        { id: "anthropic/claude-opus-4.8", label: "Claude Opus 4.8", tools: true },
      ],
      [],
    );

    render(<CopilotModelSettingsModal open onClose={vi.fn()} />);
    await waitForReady();

    fireEvent.change(screen.getByLabelText("Search models"), { target: { value: "claude" } });

    expect(screen.getByLabelText("Claude Opus 4.8")).toBeTruthy();
    expect(screen.queryByLabelText("GPT-5.6 Sol")).toBeNull();
  });

  it("switches visible models when changing browse tabs", async () => {
    mockCatalog(
      [{ id: "openai/gpt-5.6-sol", label: "GPT-5.6 Sol", tools: true }],
      [{ id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", tools: true }],
    );

    render(<CopilotModelSettingsModal open onClose={vi.fn()} />);
    await waitForReady();

    expect(screen.getByLabelText("GPT-5.6 Sol")).toBeTruthy();
    expect(screen.queryByLabelText("Llama 3.3 70B")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Recent" }));

    expect(screen.getByLabelText("Llama 3.3 70B")).toBeTruthy();
    expect(screen.queryByLabelText("GPT-5.6 Sol")).toBeNull();
  });

  it("shows enabled models on the Enabled tab", async () => {
    mockCatalog(
      [{ id: "openai/gpt-5.6-sol", label: "GPT-5.6 Sol", tools: true }],
      [{ id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", tools: true }],
    );

    render(<CopilotModelSettingsModal open onClose={vi.fn()} />);
    await waitForReady();

    fireEvent.click(screen.getByRole("tab", { name: /^Enabled/ }));

    expect(screen.getByLabelText("GPT-5.6 Sol")).toBeTruthy();
    expect(screen.queryByLabelText("Llama 3.3 70B")).toBeNull();
  });

  it("removes a model via active chip", async () => {
    mockCatalog(
      [
        { id: "openai/gpt-5.6-sol", label: "GPT-5.6 Sol", tools: true },
        { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", tools: true },
      ],
      [],
    );

    window.localStorage.setItem(
      ENABLED_MODELS_STORAGE_KEY,
      JSON.stringify({
        modelIds: ["openai/gpt-5.6-sol", "meta-llama/llama-3.3-70b-instruct"],
      }),
    );

    render(<CopilotModelSettingsModal open onClose={vi.fn()} />);
    await waitForReady();

    const chip = screen.getByTestId("copilot-model-active-chip-meta-llama--llama-3.3-70b-instruct");
    fireEvent.click(within(chip).getByRole("button", { name: "Remove Llama 3.3 70B from picker" }));

    const stored = JSON.parse(window.localStorage.getItem(ENABLED_MODELS_STORAGE_KEY) ?? "{}") as {
      modelIds: string[];
    };
    expect(stored.modelIds).not.toContain("meta-llama/llama-3.3-70b-instruct");
    expect(stored.modelIds).toContain("openai/gpt-5.6-sol");
  });

  it("disables removing the last enabled model via chip", async () => {
    window.localStorage.setItem(
      ENABLED_MODELS_STORAGE_KEY,
      JSON.stringify({ modelIds: ["openai/gpt-5.6-sol"] }),
    );

    mockCatalog([{ id: "openai/gpt-5.6-sol", label: "GPT-5.6 Sol", tools: true }]);

    render(<CopilotModelSettingsModal open onClose={vi.fn()} />);
    await waitForReady();

    const chip = screen.getByTestId("copilot-model-active-chip-openai--gpt-5.6-sol");
    const removeButton = within(chip).getByRole("button", { name: "Remove GPT-5.6 Sol from picker" });
    expect(removeButton).toBeDisabled();
  });
});
