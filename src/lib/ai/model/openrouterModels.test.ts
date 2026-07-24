import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearOpenRouterModelCatalogCache,
  fetchOpenRouterModelCatalog,
} from "./openrouterModels";

describe("fetchOpenRouterModelCatalog", () => {
  beforeEach(() => {
    clearOpenRouterModelCatalogCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearOpenRouterModelCatalogCache();
  });

  it("maps popular and recent tool-capable models", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("most-popular")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "openai/gpt-5.6-sol",
                name: "GPT-5.6 Sol",
                supported_parameters: ["tools", "temperature"],
              },
              {
                id: "vendor/image-only",
                name: "Image Only",
                supported_parameters: ["temperature"],
              },
            ],
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          data: [
            {
              id: "meta-llama/llama-3.3-70b-instruct",
              name: "Llama 3.3 70B Instruct",
              supported_parameters: ["tools"],
            },
          ],
        }),
        { status: 200 },
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const catalog = await fetchOpenRouterModelCatalog("test-key");
    expect(catalog.popular).toEqual([
      { id: "openai/gpt-5.6-sol", label: "GPT-5.6 Sol", tools: true },
    ]);
    expect(catalog.recent).toEqual([
      {
        id: "meta-llama/llama-3.3-70b-instruct",
        label: "Llama 3.3 70B Instruct",
        tools: true,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reuses the in-memory cache", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              id: "openai/gpt-5.6-sol",
              name: "GPT-5.6 Sol",
              supported_parameters: ["tools"],
            },
          ],
        }),
        { status: 200 },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    await fetchOpenRouterModelCatalog("test-key");
    await fetchOpenRouterModelCatalog("test-key");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
