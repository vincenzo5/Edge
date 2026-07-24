import { beforeEach, describe, expect, it } from "vitest";

import { listSeedModelIds } from "./allowlist";
import {
  ENABLED_MODELS_STORAGE_KEY,
  isModelEnabled,
  listEnabledAgentModels,
  loadEnabledModelIds,
  resetEnabledModelsToSeed,
  resolveEnabledModelId,
  saveEnabledModelIds,
  toggleEnabledModel,
} from "./enabledModelsStore";

describe("enabledModelsStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to seed model ids", () => {
    expect(loadEnabledModelIds()).toEqual(listSeedModelIds());
    expect(listEnabledAgentModels().length).toBe(listSeedModelIds().length);
  });

  it("persists enabled model ids", () => {
    saveEnabledModelIds(["meta-llama/llama-3.3-70b-instruct", "x-ai/grok-4.5"]);
    expect(loadEnabledModelIds()).toEqual(["meta-llama/llama-3.3-70b-instruct", "x-ai/grok-4.5"]);
    expect(window.localStorage.getItem(ENABLED_MODELS_STORAGE_KEY)).toContain("llama-3.3");
  });

  it("enables a model via toggle", () => {
    const next = toggleEnabledModel("meta-llama/llama-3.3-70b-instruct", true);
    expect(next).toContain("meta-llama/llama-3.3-70b-instruct");
    expect(isModelEnabled("meta-llama/llama-3.3-70b-instruct")).toBe(true);
  });

  it("prevents disabling the last enabled model", () => {
    saveEnabledModelIds(["x-ai/grok-4.5"]);
    const next = toggleEnabledModel("x-ai/grok-4.5", false);
    expect(next).toEqual(["x-ai/grok-4.5"]);
  });

  it("resolves preferred enabled model ids", () => {
    saveEnabledModelIds(["openai/gpt-5.6-sol", "x-ai/grok-4.5"]);
    expect(resolveEnabledModelId("openai/gpt-5.6-sol")).toBe("openai/gpt-5.6-sol");
    expect(resolveEnabledModelId("anthropic/claude-opus-4.8")).toBe("x-ai/grok-4.5");
  });

  it("falls back to default seed model when preferred is disabled", () => {
    saveEnabledModelIds(["openai/gpt-5.6-sol"]);
    expect(resolveEnabledModelId("anthropic/claude-opus-4.8")).toBe("openai/gpt-5.6-sol");
  });

  it("resets to seed defaults", () => {
    saveEnabledModelIds(["meta-llama/llama-3.3-70b-instruct"]);
    expect(resetEnabledModelsToSeed()).toEqual(listSeedModelIds());
  });
});
