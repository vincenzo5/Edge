import "server-only";

import { z } from "zod";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const CACHE_TTL_MS = 10 * 60 * 1000;

export const catalogModelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  tools: z.literal(true),
});

export type CatalogModel = z.infer<typeof catalogModelSchema>;

export const modelCatalogResponseSchema = z.object({
  popular: z.array(catalogModelSchema),
  recent: z.array(catalogModelSchema),
});

export type ModelCatalogResponse = z.infer<typeof modelCatalogResponseSchema>;

const openRouterModelsPageSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      supported_parameters: z.array(z.string()).optional(),
    }),
  ),
});

type CatalogCache = {
  at: number;
  data: ModelCatalogResponse;
};

let catalogCache: CatalogCache | null = null;

function mapOpenRouterModel(raw: {
  id: string;
  name: string;
  supported_parameters?: string[];
}): CatalogModel | null {
  if (!raw.supported_parameters?.includes("tools")) return null;
  return {
    id: raw.id,
    label: raw.name,
    tools: true,
  };
}

function dedupeCatalogModels(models: CatalogModel[]): CatalogModel[] {
  const seen = new Set<string>();
  const result: CatalogModel[] = [];
  for (const model of models) {
    if (seen.has(model.id)) continue;
    seen.add(model.id);
    result.push(model);
  }
  return result;
}

async function fetchModelsBySort(
  sort: "most-popular" | "newest",
  apiKey: string,
  referer: string,
): Promise<CatalogModel[]> {
  const url = `${OPENROUTER_MODELS_URL}?sort=${sort}&limit=25&supported_parameters=tools&output_modalities=text`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": referer,
      "X-Title": "Edge",
      "X-OpenRouter-Title": "Edge",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`OpenRouter models request failed (${response.status})`);
  }

  const parsed = openRouterModelsPageSchema.parse(await response.json());
  return dedupeCatalogModels(
    parsed.data
      .map((item) => mapOpenRouterModel(item))
      .filter((item): item is CatalogModel => item != null),
  );
}

export async function fetchOpenRouterModelCatalog(
  apiKey: string,
  referer = "https://edge.local",
): Promise<ModelCatalogResponse> {
  const now = Date.now();
  if (catalogCache && now - catalogCache.at < CACHE_TTL_MS) {
    return catalogCache.data;
  }

  const [popular, recent] = await Promise.all([
    fetchModelsBySort("most-popular", apiKey, referer),
    fetchModelsBySort("newest", apiKey, referer),
  ]);

  const data = modelCatalogResponseSchema.parse({ popular, recent });
  catalogCache = { at: now, data };
  return data;
}

/** Test helper — clears in-memory catalog cache. */
export function clearOpenRouterModelCatalogCache(): void {
  catalogCache = null;
}
