import type { SerializedDrawing, Theme } from "./contracts";

export type AnnotationKind = "thesis" | "invalidation" | "target" | "note";
export type AnnotationStatus =
  | "proposed"
  | "accepted"
  | "active"
  | "triggered"
  | "invalidated";
export type AnnotationSource = "user" | "ai" | "imported";

export type DrawingMetadata = {
  kind?: AnnotationKind;
  status?: AnnotationStatus;
  source?: AnnotationSource;
  rationale?: string;
  threadId?: string;
  linkGroupId?: string;
  playbookId?: string;
  fields?: Record<string, unknown>;
  computed?: Record<string, string | number | boolean>;
  links?: Array<{ drawingId?: string; symbol?: string }>;
};

export const ANNOTATION_KINDS: AnnotationKind[] = [
  "thesis",
  "invalidation",
  "target",
  "note",
];

export const ANNOTATION_KIND_LABELS: Record<AnnotationKind, string> = {
  thesis: "THS",
  invalidation: "INV",
  target: "TGT",
  note: "NOTE",
};

export const ANNOTATION_KIND_FULL_LABELS: Record<AnnotationKind, string> = {
  thesis: "Thesis",
  invalidation: "Invalidation",
  target: "Target",
  note: "Note",
};

const KIND_COLORS_DARK: Record<AnnotationKind, string> = {
  thesis: "#00FF88",
  invalidation: "#ef4444",
  target: "#22c55e",
  note: "#64748b",
};

const KIND_COLORS_LIGHT: Record<AnnotationKind, string> = {
  thesis: "#059669",
  invalidation: "#dc2626",
  target: "#16a34a",
  note: "#475569",
};

export function defaultColorForKind(
  kind: AnnotationKind,
  theme: Theme,
): string {
  return theme === "dark" ? KIND_COLORS_DARK[kind] : KIND_COLORS_LIGHT[kind];
}

export function normalizeMetadata(
  input?: DrawingMetadata | null,
): DrawingMetadata | undefined {
  if (!input || Object.keys(input).length === 0) return undefined;

  const source = input.source ?? "user";
  let status = input.status;

  if (!status) {
    status = source === "ai" ? "proposed" : "active";
  }

  return {
    ...input,
    source,
    status,
  };
}

export function mergeMetadata(
  existing: DrawingMetadata | undefined,
  patch: DrawingMetadata | undefined,
): DrawingMetadata | undefined {
  if (!patch) return existing;
  if (!existing) return normalizeMetadata(patch);

  const merged: DrawingMetadata = {
    ...existing,
    ...patch,
    fields: patch.fields
      ? { ...existing.fields, ...patch.fields }
      : existing.fields,
    computed: patch.computed
      ? { ...existing.computed, ...patch.computed }
      : existing.computed,
    links: patch.links ?? existing.links,
  };

  if ("kind" in patch && patch.kind === undefined) {
    delete merged.kind;
  }
  if ("rationale" in patch && patch.rationale === undefined) {
    delete merged.rationale;
  }

  const normalized = normalizeMetadata(merged);
  if (!normalized?.kind && !normalized?.rationale && !normalized?.threadId && !normalized?.playbookId && !normalized?.linkGroupId && !normalized?.fields && !normalized?.computed && !normalized?.links) {
    if (normalized?.source === "user" && normalized?.status === "active") {
      return undefined;
    }
  }
  return normalized;
}

export type MetadataFilters = {
  kind?: AnnotationKind | AnnotationKind[];
  status?: AnnotationStatus | AnnotationStatus[];
  source?: AnnotationSource | AnnotationSource[];
};

function matchesFilter<T extends string>(
  value: T | undefined,
  filter: T | T[] | undefined,
): boolean {
  if (!filter) return true;
  if (!value) return false;
  const allowed = Array.isArray(filter) ? filter : [filter];
  return allowed.includes(value);
}

export function filterDrawingsByMetadata(
  drawings: SerializedDrawing[],
  filters: MetadataFilters,
): SerializedDrawing[] {
  return drawings.filter((d) => {
    const m = d.metadata;
    if (!m && (filters.kind || filters.status || filters.source)) {
      return false;
    }
    return (
      matchesFilter(m?.kind, filters.kind) &&
      matchesFilter(m?.status, filters.status) &&
      matchesFilter(m?.source, filters.source)
    );
  });
}

export function summarizeAnnotations(drawings: SerializedDrawing[]) {
  const byKind: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let proposedCount = 0;

  for (const d of drawings) {
    const kind = d.metadata?.kind;
    const status = d.metadata?.status;
    if (kind) {
      byKind[kind] = (byKind[kind] ?? 0) + 1;
    }
    if (status) {
      byStatus[status] = (byStatus[status] ?? 0) + 1;
      if (status === "proposed") proposedCount++;
    }
  }

  return { byKind, byStatus, proposedCount, total: drawings.length };
}

export function buildThesisSummary(drawings: SerializedDrawing[]): string | undefined {
  const withKind = drawings.filter((d) => d.metadata?.kind);
  if (withKind.length === 0) return undefined;

  const parts: string[] = [];
  const countByKind = (kind: AnnotationKind, status?: AnnotationStatus) =>
    withKind.filter(
      (d) =>
        d.metadata?.kind === kind &&
        (status ? d.metadata?.status === status : true),
    ).length;

  const thesisActive = countByKind("thesis", "active");
  if (thesisActive > 0) {
    parts.push(`${thesisActive} active thesis${thesisActive > 1 ? "es" : ""}`);
  }

  const inv = countByKind("invalidation");
  if (inv > 0) {
    parts.push(`${inv} invalidation level${inv > 1 ? "s" : ""}`);
  }

  const tgt = countByKind("target");
  if (tgt > 0) {
    parts.push(`${tgt} target${tgt > 1 ? "s" : ""}`);
  }

  const proposed = withKind.filter((d) => d.metadata?.status === "proposed").length;
  if (proposed > 0) {
    parts.push(`${proposed} proposed`);
  }

  return parts.length > 0 ? parts.join(", ") : undefined;
}

export function formatObjectTreeLabel(
  overlayLabel: string,
  metadata?: DrawingMetadata,
): string {
  if (!metadata?.kind) return overlayLabel;

  const kindTag = ANNOTATION_KIND_LABELS[metadata.kind];
  const proposed =
    metadata.source === "ai" && metadata.status === "proposed" ? "?" : "";
  return `[${kindTag}${proposed}] ${overlayLabel}`;
}
