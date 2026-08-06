import { describe, expect, it } from 'vitest';
import {
  EMPTY_ANNOTATION_MARKERS,
  EMPTY_DRAWINGS,
  EMPTY_EVENT_MARKERS,
  EMPTY_INDICATORS,
  EMPTY_PRICE_AXIS_ANNOTATIONS,
  EMPTY_REFERENCE_LINES,
} from './stableEmptyProps';

describe('stableEmptyProps', () => {
  it('exports stable empty array identities', () => {
    expect(EMPTY_DRAWINGS).toBe(EMPTY_DRAWINGS);
    expect(EMPTY_INDICATORS).toBe(EMPTY_INDICATORS);
    expect(EMPTY_EVENT_MARKERS).toBe(EMPTY_EVENT_MARKERS);
    expect(EMPTY_REFERENCE_LINES).toBe(EMPTY_REFERENCE_LINES);
    expect(EMPTY_ANNOTATION_MARKERS).toBe(EMPTY_ANNOTATION_MARKERS);
    expect(EMPTY_PRICE_AXIS_ANNOTATIONS).toBe(EMPTY_PRICE_AXIS_ANNOTATIONS);
    expect(EMPTY_DRAWINGS).toEqual([]);
    expect(EMPTY_INDICATORS).toEqual([]);
  });
});
