import { describe, expect, it } from 'vitest';
import { mergeChartSettings } from './chartSettings';

describe('app chartSettings re-export', () => {
  it('keeps event overlay defaults quiet for dense feeds', () => {
    expect(mergeChartSettings().events).toEqual({
      showEarnings: true,
      showDividend: true,
      showSplit: true,
      showFiling: true,
      showMacro: true,
      showNews: false,
      showOptionsExpiration: false,
    });
  });

  it('merges event overlay overrides through the app import path', () => {
    expect(
      mergeChartSettings({
        events: {
          showNews: true,
          showOptionsExpiration: true,
        },
      }).events,
    ).toMatchObject({
      showNews: true,
      showOptionsExpiration: true,
    });
  });
});
