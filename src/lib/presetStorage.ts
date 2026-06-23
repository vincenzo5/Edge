import type {
  ChartTemplatePayload,
  PresetEnvelope,
  StudyTemplatePayload,
} from './chart/presets/types';
import { createPresetId } from './chart/presets/types';
import { notifyPresetsUpdated } from './persistence/sync/presetEvents';

const STORAGE_KEY = 'tv-ai:presets:v1';
export const MAX_PRESETS = 50;

export function loadPresets(): PresetEnvelope[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPresetEnvelope);
  } catch {
    return [];
  }
}

function isPresetEnvelope(value: unknown): value is PresetEnvelope {
  if (!value || typeof value !== 'object') return false;
  const v = value as PresetEnvelope;
  return (
    v.version === 1 &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.createdAt === 'number' &&
    (v.kind === 'chart' || v.kind === 'study') &&
    v.payload != null
  );
}

export function savePresets(presets: PresetEnvelope[], options?: { notify?: boolean }): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.slice(0, MAX_PRESETS)));
    if (options?.notify !== false) {
      notifyPresetsUpdated();
    }
  } catch {
    // ignore quota errors
  }
}

export function savePreset(envelope: PresetEnvelope): { ok: true } | { ok: false; reason: 'cap' } {
  const presets = loadPresets();
  if (presets.length >= MAX_PRESETS && !presets.some((p) => p.id === envelope.id)) {
    return { ok: false, reason: 'cap' };
  }
  const next = presets.filter((p) => p.id !== envelope.id);
  next.unshift(envelope);
  savePresets(next);
  return { ok: true };
}

export function deletePreset(id: string): void {
  savePresets(loadPresets().filter((p) => p.id !== id));
}

export function createChartPreset(name: string, payload: ChartTemplatePayload): PresetEnvelope {
  return {
    version: 1,
    id: createPresetId(),
    name,
    createdAt: Date.now(),
    kind: 'chart',
    payload,
  };
}

export function createStudyPreset(name: string, payload: StudyTemplatePayload): PresetEnvelope {
  return {
    version: 1,
    id: createPresetId(),
    name,
    createdAt: Date.now(),
    kind: 'study',
    payload,
  };
}

export function listPresetsByKind(kind: PresetEnvelope['kind']): PresetEnvelope[] {
  return loadPresets().filter((p) => p.kind === kind);
}
