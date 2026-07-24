import "server-only";

import { isDatabaseConfigured } from "@/db";
import { getCurrentUser } from "@/lib/persistence/auth/getCurrentUser";
import {
  ensurePatternTaxonomy,
  getPatternRecord,
  listPatternRecords,
  patchPatternRecordMetadata,
  patternLibraryStatsForUser,
  upsertPatternRecord,
} from "@/lib/persistence/repositories/patternLibraryRepository";
import {
  compareRecordSummariesNewestFirst,
  isInteractiveCapture,
  toRecordSummary,
  type PatternRecordSummary,
} from "@/lib/patternLibrary/recordSummaries";
import {
  FROZEN_CHART_STYLE,
  renderCandlestickSvg,
  sectionsToRenderOverlays,
} from "@/lib/patternLibrary/renderChart";
import * as fsStorage from "@/lib/patternLibrary/storage";
import type { OhlcvBar, PatternRecord, PatternTaxonomy } from "@/lib/patternLibrary/types";
import type { PatternRecordMetadataPatch } from "@/lib/patternLibrary/storage";

export type SavePatternRecordOptions = {
  writeSvg?: boolean;
  renderBars?: OhlcvBar[];
  leftPaddingApplied?: number;
};

export type PatternLibraryStore = {
  loadTaxonomy(): Promise<PatternTaxonomy>;
  loadRecord(id: string): Promise<PatternRecord | null>;
  saveRecord(record: PatternRecord, options?: SavePatternRecordOptions): Promise<void>;
  listInteractiveCaptureSummaries(): Promise<PatternRecordSummary[]>;
  patchRecordMetadata(id: string, patch: PatternRecordMetadataPatch): Promise<PatternRecord | null>;
  readRecordSvg(id: string): Promise<string | null>;
  loadAllRecords(): Promise<PatternRecord[]>;
  libraryStats(): Promise<{
    total: number;
    takes: number;
    passes: number;
    byFamily: Record<string, number>;
  }>;
};

function renderRecordSvg(record: PatternRecord): string | null {
  if (record.ohlcv.length < 2) return null;
  const sections = record.capture
    ? sectionsToRenderOverlays(
        record.capture.sections,
        record.capture.patternStart.barIndex,
        record.capture.paddingBars.left,
      )
    : undefined;
  return renderCandlestickSvg(record.ohlcv, FROZEN_CHART_STYLE, { sections });
}

function createFsPatternLibraryStore(): PatternLibraryStore {
  return {
    async loadTaxonomy() {
      return fsStorage.loadTaxonomy();
    },
    async loadRecord(id) {
      return fsStorage.loadRecord(id);
    },
    async saveRecord(record, options) {
      fsStorage.saveRecord(record, options);
    },
    async listInteractiveCaptureSummaries() {
      return fsStorage.listInteractiveCaptureSummaries();
    },
    async patchRecordMetadata(id, patch) {
      return fsStorage.patchRecordMetadata(id, patch);
    },
    async readRecordSvg(id) {
      const fromDisk = fsStorage.readRecordSvg(id);
      if (fromDisk) return fromDisk;
      const record = fsStorage.loadRecord(id);
      return record ? renderRecordSvg(record) : null;
    },
    async loadAllRecords() {
      return fsStorage.loadAllRecords();
    },
    async libraryStats() {
      return fsStorage.libraryStats();
    },
  };
}

function createPostgresPatternLibraryStore(userId: string): PatternLibraryStore {
  return {
    async loadTaxonomy() {
      const record = await ensurePatternTaxonomy(userId);
      return record.taxonomy;
    },
    async loadRecord(id) {
      return getPatternRecord(userId, id);
    },
    async saveRecord(record) {
      await upsertPatternRecord(userId, record);
    },
    async listInteractiveCaptureSummaries() {
      const records = await listPatternRecords(userId);
      return records
        .filter(isInteractiveCapture)
        .map((record) => toRecordSummary(record, record.ohlcv.length >= 2))
        .sort(compareRecordSummariesNewestFirst);
    },
    async patchRecordMetadata(id, patch) {
      return patchPatternRecordMetadata(userId, id, patch);
    },
    async readRecordSvg(id) {
      const record = await getPatternRecord(userId, id);
      return record ? renderRecordSvg(record) : null;
    },
    async loadAllRecords() {
      return listPatternRecords(userId);
    },
    async libraryStats() {
      return patternLibraryStatsForUser(userId);
    },
  };
}

export function createPatternLibraryStore(userId?: string | null): PatternLibraryStore {
  if (userId && isDatabaseConfigured()) {
    return createPostgresPatternLibraryStore(userId);
  }
  return createFsPatternLibraryStore();
}

export class PatternLibraryAuthRequiredError extends Error {
  constructor() {
    super("Authentication required when cloud persistence is enabled");
    this.name = "PatternLibraryAuthRequiredError";
  }
}

export async function resolvePatternLibraryStoreForRequest(): Promise<PatternLibraryStore> {
  if (!isDatabaseConfigured()) {
    return createFsPatternLibraryStore();
  }
  const user = await getCurrentUser();
  if (!user) {
    throw new PatternLibraryAuthRequiredError();
  }
  return createPostgresPatternLibraryStore(user.id);
}
