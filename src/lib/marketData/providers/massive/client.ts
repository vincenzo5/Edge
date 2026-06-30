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
  url.searchParams.set("apiKey", apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url);
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
