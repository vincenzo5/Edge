import { getCatalogEntry } from '../indicators/registry';
import type { StudyTemplatePayload } from './types';

export function isStudyPayloadValid(payload: StudyTemplatePayload): boolean {
  const entry = getCatalogEntry(payload.name);
  return entry?.implemented === true;
}

export function filterValidStudies(
  payloads: StudyTemplatePayload[],
): { valid: StudyTemplatePayload[]; skipped: string[] } {
  const valid: StudyTemplatePayload[] = [];
  const skipped: string[] = [];
  for (const p of payloads) {
    if (isStudyPayloadValid(p)) {
      valid.push(p);
    } else {
      skipped.push(p.name);
    }
  }
  return { valid, skipped };
}
