import { PLAYBOOK_PRESET_LIST } from "@/lib/trading/playbook/presets";
import type { PlaybookTemplate } from "@/lib/trading/playbook/types";

type TemplateLibraryResponse = {
  presets?: PlaybookTemplate[] | null;
  userTemplates?: PlaybookTemplate[] | null;
};

let cachedTemplates: PlaybookTemplate[] | null = null;
let inflight: Promise<PlaybookTemplate[]> | null = null;

/** Drop null/undefined holes and entries missing a string id (malformed API/cache payloads). */
export function normalizePlaybookTemplates(
  templates: ReadonlyArray<PlaybookTemplate | null | undefined> | null | undefined,
): PlaybookTemplate[] {
  if (!Array.isArray(templates)) return [];
  return templates.filter(
    (item): item is PlaybookTemplate =>
      item != null && typeof item.id === "string" && item.id.length > 0,
  );
}

/** Merge preset + user library arrays from `/api/trading/playbooks/templates`. */
export function mergePlaybookTemplateLibrary(
  body: TemplateLibraryResponse | null | undefined,
): PlaybookTemplate[] {
  return [
    ...normalizePlaybookTemplates(body?.presets),
    ...normalizePlaybookTemplates(body?.userTemplates),
  ];
}

export function getCachedPlaybookTemplates(): PlaybookTemplate[] {
  return cachedTemplates ?? PLAYBOOK_PRESET_LIST;
}

export function setCachedPlaybookTemplates(templates: PlaybookTemplate[]): void {
  cachedTemplates = normalizePlaybookTemplates(templates);
}

export function isPlaybookTemplateCacheWarm(): boolean {
  return cachedTemplates != null;
}

export function clearPlaybookTemplateCache(): void {
  cachedTemplates = null;
  inflight = null;
}

async function fetchPlaybookTemplates(): Promise<PlaybookTemplate[]> {
  try {
    const res = await fetch("/api/trading/playbooks/templates");
    if (!res.ok) return PLAYBOOK_PRESET_LIST;
    const body = (await res.json()) as TemplateLibraryResponse;
    const merged = mergePlaybookTemplateLibrary(body);
    return merged.length > 0 ? merged : PLAYBOOK_PRESET_LIST;
  } catch {
    return PLAYBOOK_PRESET_LIST;
  }
}

/** Client cache for placement + Settings default policy resolution. */
export async function ensurePlaybookTemplatesCached(): Promise<PlaybookTemplate[]> {
  if (cachedTemplates) return cachedTemplates;
  if (inflight) return inflight;
  inflight = fetchPlaybookTemplates().then((templates) => {
    cachedTemplates = templates;
    inflight = null;
    return templates;
  });
  return inflight;
}
