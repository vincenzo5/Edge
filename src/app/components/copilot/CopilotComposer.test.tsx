import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CopilotComposer } from "./CopilotComposer";

vi.mock("@/lib/persistence/client/copilotAttachmentsClient", () => ({
  uploadCopilotAttachment: vi.fn(),
  resolveCopilotAttachmentPreviewUrl: vi.fn(async (id: string) => `blob:preview-${id}`),
}));

import {
  uploadCopilotAttachment,
} from "@/lib/persistence/client/copilotAttachmentsClient";

const DEFAULT_MODELS = [
  { id: "x-ai/grok-4.5", label: "Grok 4.5", subtitle: "openrouter · grok-4.5" },
  { id: "openai/gpt-5.6-sol", label: "GPT-5.6", subtitle: "openrouter · gpt-5.6-sol" },
];

function renderComposer(overrides: Partial<Parameters<typeof CopilotComposer>[0]> = {}) {
  const onSend = vi.fn();
  const onCancel = vi.fn();
  const onModelChange = vi.fn();

  render(
    <CopilotComposer
      isStreaming={false}
      onSend={onSend}
      onCancel={onCancel}
      modelId="x-ai/grok-4.5"
      models={DEFAULT_MODELS}
      onModelChange={onModelChange}
      supportsVision
      {...overrides}
    />,
  );

  return { onSend, onCancel, onModelChange };
}

describe("CopilotComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn();
  });

  it("renders pill query-bar controls", () => {
    renderComposer();

    expect(screen.getByTestId("copilot-query-bar")).toBeTruthy();
    expect(screen.getByTestId("copilot-attach")).toBeTruthy();
    expect(screen.getByTestId("copilot-composer-input")).toBeTruthy();
    expect(screen.getByTestId("copilot-model-chip")).toBeTruthy();
    expect(screen.getByTestId("copilot-send")).toBeTruthy();
    expect(screen.getByLabelText("Attach")).toBeTruthy();
    expect(screen.getByLabelText("Model select")).toBeTruthy();
    expect(screen.getByLabelText("Submit")).toBeTruthy();
  });

  it("shows model label on chip", () => {
    renderComposer();

    expect(screen.getByTestId("copilot-model-chip")).toHaveTextContent("Grok 4.5");
  });

  it("truncates model chip label when compact", () => {
    renderComposer({
      modelId: "openai/gpt-5.6-sol",
      models: [
        {
          id: "openai/gpt-5.6-sol",
          label: "Very Long Model Name Here",
        },
      ],
      compactChip: true,
    });

    expect(screen.getByTestId("copilot-model-chip")).toHaveTextContent("Very Long Mod…");
  });

  it("opens model menu and selects a model", () => {
    const { onModelChange } = renderComposer();

    fireEvent.click(screen.getByTestId("copilot-model-chip"));
    expect(screen.getByTestId("copilot-model-option-openai/gpt-5.6-sol")).toBeTruthy();

    fireEvent.click(screen.getByTestId("copilot-model-option-openai/gpt-5.6-sol"));

    expect(onModelChange).toHaveBeenCalledWith("openai/gpt-5.6-sol");
    expect(screen.queryByTestId("copilot-model-option-openai/gpt-5.6-sol")).toBeNull();
  });

  it("closes model menu on Escape", () => {
    renderComposer();

    fireEvent.click(screen.getByTestId("copilot-model-chip"));
    expect(screen.getByTestId("copilot-model-option-openai/gpt-5.6-sol")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByTestId("copilot-model-option-openai/gpt-5.6-sol")).toBeNull();
  });

  it("disables model chip while streaming and closes menu", () => {
    const { onModelChange } = renderComposer({ isStreaming: true });

    expect(screen.getByTestId("copilot-model-chip")).toBeDisabled();
    fireEvent.click(screen.getByTestId("copilot-model-chip"));
    expect(onModelChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId("copilot-model-option-openai/gpt-5.6-sol")).toBeNull();
  });

  it("disables submit when draft is empty", () => {
    renderComposer();

    expect(screen.getByTestId("copilot-send")).toBeDisabled();
  });

  it("sends on submit click when draft is non-empty", () => {
    const { onSend } = renderComposer();

    fireEvent.change(screen.getByTestId("copilot-composer-input"), {
      target: { value: "Hello Copilot" },
    });
    fireEvent.click(screen.getByTestId("copilot-send"));

    expect(onSend).toHaveBeenCalledWith("Hello Copilot", []);
    expect(screen.getByTestId("copilot-composer-input")).toHaveValue("");
  });

  it("sends on Enter and inserts newline on Shift+Enter", () => {
    const { onSend } = renderComposer();

    const input = screen.getByTestId("copilot-composer-input");

    fireEvent.change(input, { target: { value: "Line one" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    expect(onSend).toHaveBeenCalledWith("Line one", []);

    fireEvent.change(input, { target: { value: "Line one\nLine two" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("shows stop control while streaming", () => {
    const { onCancel } = renderComposer({ isStreaming: true });

    expect(screen.queryByTestId("copilot-send")).toBeNull();
    expect(screen.getByTestId("copilot-cancel")).toBeTruthy();
    expect(screen.getByLabelText("Stop")).toBeTruthy();

    fireEvent.click(screen.getByTestId("copilot-cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("opens attach menu and uploads an image", async () => {
    vi.mocked(uploadCopilotAttachment).mockResolvedValueOnce({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      mimeType: "image/png",
      byteSize: 128,
      name: "chart.png",
      source: "upload",
      createdAt: new Date().toISOString(),
    });

    renderComposer();

    fireEvent.click(screen.getByTestId("copilot-attach"));
    fireEvent.click(screen.getByTestId("copilot-attach-upload"));

    const input = screen.getByTestId("copilot-attach-input") as HTMLInputElement;
    const file = new File(["png"], "chart.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("copilot-attachment-previews")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("copilot-send"));

    expect(uploadCopilotAttachment).toHaveBeenCalled();
  });

  it("shows attach error when vision is unsupported", async () => {
    const onRequestVisionModel = vi.fn();
    renderComposer({ supportsVision: false, onRequestVisionModel, modelId: "z-ai/glm-5.2" });

    fireEvent.click(screen.getByTestId("copilot-attach"));
    fireEvent.click(screen.getByTestId("copilot-attach-upload"));

    const input = screen.getByTestId("copilot-attach-input") as HTMLInputElement;
    const file = new File(["png"], "chart.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("copilot-attach-error")).toHaveTextContent(
        "Choose a vision-capable model",
      );
    });

    expect(onRequestVisionModel).toHaveBeenCalled();
    expect(uploadCopilotAttachment).not.toHaveBeenCalled();
  });

  it("shows hero idle placeholder and rotates after 3 seconds", () => {
    vi.useFakeTimers();
    try {
      renderComposer({ mode: "hero" });

      expect(screen.getByTestId("copilot-hero-placeholder")).toHaveTextContent(
        "What do you want to know?",
      );

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.getByTestId("copilot-hero-placeholder")).toHaveTextContent(
        "Prepare chart for analysis?",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("hides hero placeholder when draft has text", () => {
    renderComposer({ mode: "hero" });

    fireEvent.change(screen.getByTestId("copilot-composer-input"), {
      target: { value: "Hello" },
    });

    expect(screen.queryByTestId("copilot-hero-placeholder")).toBeNull();
  });

  it("grows textarea height with multiline draft", () => {
    renderComposer();

    const textarea = screen.getByTestId("copilot-composer-input") as HTMLTextAreaElement;
    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      get() {
        const lineCount = textarea.value.split("\n").length;
        return 28 * lineCount;
      },
    });

    fireEvent.change(textarea, { target: { value: "Line one\nLine two\nLine three" } });

    expect(textarea.style.height).toBe("84px");
  });
});
