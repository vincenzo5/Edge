import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  patternRecordSchema,
  patternTaxonomySchema,
  parsePatternId,
  type OhlcvBar,
  type PatternRecord,
  type PatternTaxonomy,
} from "./types";
import { createDefaultTaxonomy } from "./taxonomy";
import {
  compareRecordSummariesNewestFirst,
  isInteractiveCapture,
  toRecordSummary,
  type PatternRecordSummary,
} from "./recordSummaries";
import {
  renderCandlestickSvg,
  FROZEN_CHART_STYLE,
  sectionsToRenderOverlays,
} from "./renderChart";

export const PATTERN_LIBRARY_DIR = path.join(process.cwd(), "data/pattern-library");
export const TAXONOMY_PATH = path.join(PATTERN_LIBRARY_DIR, "taxonomy.json");
export const RECORDS_DIR = path.join(PATTERN_LIBRARY_DIR, "records");

export function ensureLibraryDirs(): void {
  mkdirSync(RECORDS_DIR, { recursive: true });
}

function recordsRootPrefix(): string {
  return `${path.resolve(RECORDS_DIR)}${path.sep}`;
}

function safeRecordJsonPath(id: string): string {
  parsePatternId(id);
  const resolved = path.resolve(RECORDS_DIR, `${id}.json`);
  if (!resolved.startsWith(recordsRootPrefix())) {
    throw new Error("Invalid pattern id path");
  }
  return resolved;
}

function safeRecordSvgPath(id: string): string {
  parsePatternId(id);
  const resolved = path.resolve(RECORDS_DIR, `${id}.svg`);
  if (!resolved.startsWith(recordsRootPrefix())) {
    throw new Error("Invalid pattern id path");
  }
  return resolved;
}

type TaxonomyCacheEntry = {
  taxonomy: PatternTaxonomy;
  mtimeMs: number;
  filePath: string;
};

let taxonomyCache: TaxonomyCacheEntry | null = null;

/** Reset in-memory taxonomy cache (tests). */
export function clearTaxonomyCacheForTests(): void {
  taxonomyCache = null;
}

function readTaxonomyFromDisk(filePath: string): PatternTaxonomy {
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  return patternTaxonomySchema.parse(raw);
}

export function loadTaxonomy(filePath = TAXONOMY_PATH): PatternTaxonomy {
  if (!existsSync(filePath)) {
    const taxonomy = createDefaultTaxonomy();
    ensureLibraryDirs();
    writeFileSync(filePath, JSON.stringify(taxonomy, null, 2), "utf8");
    const mtimeMs = statSync(filePath).mtimeMs;
    taxonomyCache = { taxonomy, mtimeMs, filePath };
    return taxonomy;
  }

  const mtimeMs = statSync(filePath).mtimeMs;
  if (
    taxonomyCache &&
    taxonomyCache.filePath === filePath &&
    taxonomyCache.mtimeMs === mtimeMs
  ) {
    return taxonomyCache.taxonomy;
  }

  const taxonomy = readTaxonomyFromDisk(filePath);
  taxonomyCache = { taxonomy, mtimeMs, filePath };
  return taxonomy;
}

export function saveTaxonomy(taxonomy: PatternTaxonomy, filePath = TAXONOMY_PATH): void {
  ensureLibraryDirs();
  const parsed = patternTaxonomySchema.parse({
    ...taxonomy,
    updatedAt: new Date().toISOString(),
  });
  writeFileSync(filePath, JSON.stringify(parsed, null, 2), "utf8");
  taxonomyCache = {
    taxonomy: parsed,
    mtimeMs: statSync(filePath).mtimeMs,
    filePath,
  };
}

export function recordPath(id: string): string {
  return safeRecordJsonPath(id);
}

export function recordSvgPath(id: string): string {
  return safeRecordSvgPath(id);
}

export function hasRecordSvg(id: string): boolean {
  return existsSync(recordSvgPath(id));
}

export function readRecordSvg(id: string): string | null {
  const fp = recordSvgPath(id);
  if (!existsSync(fp)) return null;
  return readFileSync(fp, "utf8");
}

export function loadRecord(id: string): PatternRecord | null {
  const fp = recordPath(id);
  if (!existsSync(fp)) return null;
  const raw = JSON.parse(readFileSync(fp, "utf8")) as unknown;
  return patternRecordSchema.parse(raw);
}

export function writeRecordSvg(
  record: PatternRecord,
  renderBars: OhlcvBar[],
  leftPaddingApplied: number,
): void {
  const svgPath = safeRecordSvgPath(record.id);
  const capture = record.capture;
  const sections = capture
    ? sectionsToRenderOverlays(
        capture.sections,
        capture.patternStart.barIndex,
        leftPaddingApplied,
      )
    : undefined;
  const svg = renderCandlestickSvg(renderBars, FROZEN_CHART_STYLE, { sections });
  writeFileSync(svgPath, svg, "utf8");
}

export function saveRecord(
  record: PatternRecord,
  options: { writeSvg?: boolean; renderBars?: OhlcvBar[]; leftPaddingApplied?: number } = {},
): void {
  ensureLibraryDirs();
  const parsed = patternRecordSchema.parse(record);
  writeFileSync(recordPath(parsed.id), JSON.stringify(parsed, null, 2), "utf8");

  const writeSvg = options.writeSvg ?? true;
  if (!writeSvg) return;

  if (parsed.capture && options.renderBars?.length) {
    writeRecordSvg(
      parsed,
      options.renderBars,
      options.leftPaddingApplied ?? parsed.capture.paddingBars.left,
    );
    return;
  }

  const svgPath = path.join(RECORDS_DIR, `${parsed.id}.svg`);
  const svg = renderCandlestickSvg(parsed.ohlcv, FROZEN_CHART_STYLE, {
    sections: parsed.capture
      ? sectionsToRenderOverlays(
          parsed.capture.sections,
          parsed.capture.patternStart.barIndex,
          0,
        )
      : undefined,
  });
  writeFileSync(svgPath, svg, "utf8");
}

export function listRecordIds(): string[] {
  if (!existsSync(RECORDS_DIR)) return [];
  return readdirSync(RECORDS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

export function loadAllRecords(): PatternRecord[] {
  return listRecordIds()
    .map((id) => loadRecord(id))
    .filter((r): r is PatternRecord => r !== null);
}

export function listInteractiveCaptureSummaries(): PatternRecordSummary[] {
  return loadAllRecords()
    .filter(isInteractiveCapture)
    .map((record) => toRecordSummary(record, hasRecordSvg(record.id)))
    .sort(compareRecordSummariesNewestFirst);
}

export type PatternRecordMetadataPatch = {
  setupFamilyId?: string;
  quality?: PatternRecord["quality"];
  notes?: string;
  thesis?: string;
};

export function patchRecordMetadata(
  id: string,
  patch: PatternRecordMetadataPatch,
): PatternRecord | null {
  const existing = loadRecord(id);
  if (!existing) return null;

  const next: PatternRecord = {
    ...existing,
    ...(patch.setupFamilyId != null ? { setupFamilyId: patch.setupFamilyId } : {}),
    ...(patch.quality != null ? { quality: patch.quality } : {}),
    ...(patch.notes != null ? { notes: patch.notes } : {}),
    plan: {
      ...existing.plan,
      ...(patch.thesis != null ? { thesis: patch.thesis } : {}),
    },
  };

  saveRecord(next, { writeSvg: false });
  return loadRecord(id);
}

export function libraryStats(): {
  total: number;
  takes: number;
  passes: number;
  byFamily: Record<string, number>;
} {
  const records = loadAllRecords();
  const byFamily: Record<string, number> = {};
  let takes = 0;
  let passes = 0;
  for (const r of records) {
    byFamily[r.setupFamilyId] = (byFamily[r.setupFamilyId] ?? 0) + 1;
    if (r.decision === "take") takes++;
    else passes++;
  }
  return { total: records.length, takes, passes, byFamily };
}
