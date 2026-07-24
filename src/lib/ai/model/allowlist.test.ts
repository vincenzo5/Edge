import { describe, expect, it } from "vitest";

import {
  EDGE_AI_DEFAULT_MODEL_FALLBACK,
  EDGE_AI_MODEL_ALLOWLIST,
  formatOpenRouterModelLabel,
  getDefaultModelId,
  getModelRef,
  listAgentModels,
  listAllowedModels,
  listSeedModelIds,
  openRouterModelIdSchema,
  resolveAllowedModelId,
} from "./allowlist";

describe("EDGE_AI_MODEL_ALLOWLIST", () => {
  it("has unique model ids", () => {
    const ids = EDGE_AI_MODEL_ALLOWLIST.map((model) => model.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only lists tool-capable models", () => {
    for (const model of EDGE_AI_MODEL_ALLOWLIST) {
      expect(model.capabilities.tools).toBe(true);
    }
  });

  it("includes the default fallback model", () => {
    expect(getModelRef(EDGE_AI_DEFAULT_MODEL_FALLBACK)).toBeDefined();
  });
});

describe("openRouterModelIdSchema", () => {
  it("accepts vendor/model ids", () => {
    expect(openRouterModelIdSchema.parse("openai/gpt-5.6-sol")).toBe("openai/gpt-5.6-sol");
    expect(openRouterModelIdSchema.parse("meta-llama/llama-3.3-70b-instruct")).toBe(
      "meta-llama/llama-3.3-70b-instruct",
    );
  });

  it("rejects ids without a vendor prefix", () => {
    expect(() => openRouterModelIdSchema.parse("invalid-id")).toThrow(/OpenRouter/i);
  });
});

describe("getModelRef", () => {
  it("returns seed metadata for known models", () => {
    expect(getModelRef("x-ai/grok-4.5")?.label).toBe("Grok 4.5");
  });

  it("synthesizes refs for valid OpenRouter ids", () => {
    const ref = getModelRef("meta-llama/llama-3.3-70b-instruct");
    expect(ref).toMatchObject({
      id: "meta-llama/llama-3.3-70b-instruct",
      provider: "openrouter",
      capabilities: { tools: true },
    });
    expect(ref?.label).toBe(formatOpenRouterModelLabel("meta-llama/llama-3.3-70b-instruct"));
  });
});

describe("getDefaultModelId", () => {
  it("returns the fallback when env is unset", () => {
    expect(getDefaultModelId({})).toBe(EDGE_AI_DEFAULT_MODEL_FALLBACK);
  });

  it("returns a valid OpenRouter env override", () => {
    expect(
      getDefaultModelId({ EDGE_AI_DEFAULT_MODEL: "meta-llama/llama-3.3-70b-instruct" }),
    ).toBe("meta-llama/llama-3.3-70b-instruct");
  });

  it("rejects an invalid env override", () => {
    expect(() => getDefaultModelId({ EDGE_AI_DEFAULT_MODEL: "invalid-id" })).toThrow(/OpenRouter/i);
  });
});

describe("resolveAllowedModelId", () => {
  it("accepts an explicit valid OpenRouter id", () => {
    expect(resolveAllowedModelId("openai/gpt-5.6-sol", {})).toBe("openai/gpt-5.6-sol");
    expect(resolveAllowedModelId("meta-llama/llama-3.3-70b-instruct", {})).toBe(
      "meta-llama/llama-3.3-70b-instruct",
    );
  });

  it("falls back to default when id is omitted", () => {
    expect(resolveAllowedModelId(undefined, {})).toBe(EDGE_AI_DEFAULT_MODEL_FALLBACK);
  });

  it("rejects invalid ids", () => {
    expect(() => resolveAllowedModelId("not-valid", {})).toThrow(/OpenRouter/i);
  });
});

describe("listAllowedModels", () => {
  it("returns a copy of the seed allowlist", () => {
    const models = listAllowedModels();
    expect(models).toHaveLength(EDGE_AI_MODEL_ALLOWLIST.length);
    expect(models[0]?.id).toBe(EDGE_AI_MODEL_ALLOWLIST[0]?.id);
    expect(models).not.toBe(EDGE_AI_MODEL_ALLOWLIST);
  });
});

describe("listSeedModelIds", () => {
  it("returns all seed ids", () => {
    expect(listSeedModelIds()).toEqual(EDGE_AI_MODEL_ALLOWLIST.map((model) => model.id));
  });
});

describe("listAgentModels", () => {
  it("returns only tool-capable seed models", () => {
    const models = listAgentModels();
    expect(models.length).toBeGreaterThan(0);
    for (const model of models) {
      expect(model.capabilities.tools).toBe(true);
      expect(getModelRef(model.id)).toBeDefined();
    }
  });
});
