/** Trim trailing zeros from fixed-decimal price strings. */
export function formatPrice(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  const fixed = value.toFixed(decimals);
  return fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

/** Compact volume label (e.g. 1.2M, 450K). */
export function formatVolume(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2).replace(/\.?0+$/, '')}K`;
  return String(Math.round(value));
}

/** Signed change string with optional percent, e.g. "-0.27 (-2.24%)". */
export function formatChange(change: number, pct: number): string {
  const sign = change >= 0 ? '+' : '';
  const pctSign = pct >= 0 ? '+' : '';
  return `${sign}${formatPrice(change)} (${pctSign}${formatPrice(pct)}%)`;
}
