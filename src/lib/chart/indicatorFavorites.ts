const STORAGE_KEY = 'tv-ai:indicator-favorites:v1';

export function loadIndicatorFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

export function saveIndicatorFavorites(names: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {
    // ignore quota errors
  }
}

export function toggleIndicatorFavorite(name: string): string[] {
  const current = loadIndicatorFavorites();
  const next = current.includes(name)
    ? current.filter((n) => n !== name)
    : [...current, name];
  saveIndicatorFavorites(next);
  return next;
}

export function isIndicatorFavorite(name: string): boolean {
  return loadIndicatorFavorites().includes(name);
}
