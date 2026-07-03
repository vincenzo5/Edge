export type MassiveFetchResult<T> = {
  data: T;
  warnings: string[];
};

export function massiveApiKey(): string | null {
  const key =
    process.env.MASSIVE_API_KEY?.trim() || process.env.POLYGON_API_KEY?.trim();
  return key ? key : null;
}

export function massiveBaseUrl(): string {
  return process.env.MASSIVE_BASE_URL?.trim() || "https://api.massive.com";
}

async function massiveFetchUrl<T>(
  url: URL,
  options: { allowPlanErrors?: boolean } = {},
): Promise<MassiveFetchResult<T>> {
  const resolved = withApiKey(url);
  const res = await fetch(resolved);
  const text = await res.text();

  if (options.allowPlanErrors && (res.status === 402 || res.status === 403)) {
    return {
      data: {} as T,
      warnings: [
        `Massive plan restricted (${res.status}): current-day data unavailable before market close on this tier.`,
      ],
    };
  }

  if (!res.ok) {
    throw new Error(`Massive request failed (${res.status})`);
  }

  if (!text.trim()) {
    return { data: {} as T, warnings: [] };
  }

  try {
    return { data: JSON.parse(text) as T, warnings: [] };
  } catch {
    throw new Error("Massive response was not valid JSON");
  }
}

export async function massiveGet<T>(
  path: string,
  params: Record<string, string> = {},
  options: { allowPlanErrors?: boolean } = {},
): Promise<MassiveFetchResult<T>> {
  const apiKey = massiveApiKey();
  if (!apiKey) {
    throw new Error("MASSIVE_API_KEY is not configured");
  }

  const base = massiveBaseUrl();
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
  if (!url.searchParams.has("apiKey")) {
    url.searchParams.set("apiKey", apiKey);
  }
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return massiveFetchUrl<T>(url, options);
}

function withApiKey(url: URL): URL {
  const resolved = new URL(url.toString());
  const apiKey = massiveApiKey();
  if (apiKey && !resolved.searchParams.has("apiKey")) {
    resolved.searchParams.set("apiKey", apiKey);
  }
  return resolved;
}

export async function massiveGetPaginated<T extends { next_url?: string; results?: unknown[] }>(
  path: string,
  params: Record<string, string> = {},
  options: { allowPlanErrors?: boolean; maxPages?: number } = {},
): Promise<MassiveFetchResult<T>> {
  const maxPages = options.maxPages ?? 20;
  const warnings: string[] = [];
  let combinedResults: unknown[] = [];
  let nextRequest: { path: string; params: Record<string, string> } | { url: URL } = {
    path,
    params,
  };
  let lastPayload = {} as T;

  for (let page = 0; page < maxPages; page += 1) {
    const result: MassiveFetchResult<T> =
      "url" in nextRequest
        ? await massiveFetchUrl<T>(nextRequest.url, options)
        : await massiveGet<T>(nextRequest.path, nextRequest.params, options);
    lastPayload = result.data;
    warnings.push(...result.warnings);
    const pageResults = Array.isArray(result.data.results) ? result.data.results : [];
    combinedResults = combinedResults.concat(pageResults);

    const nextUrlRaw =
      typeof result.data.next_url === "string" ? result.data.next_url.trim() : "";
    if (!nextUrlRaw) break;

    try {
      nextRequest = { url: withApiKey(new URL(nextUrlRaw)) };
    } catch {
      warnings.push("Massive pagination next_url was invalid; stopping early");
      break;
    }
  }

  return {
    data: {
      ...lastPayload,
      results: combinedResults as T["results"],
    },
    warnings,
  };
}
