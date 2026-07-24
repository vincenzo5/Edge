import type { ShortcutId } from "./shortcutTypes";

export const RECENT_COMMANDS_KEY = "edge:recent-commands:v1";
export const RECENT_COMMANDS_MAX = 8;

const RECENT_COMMANDS_EVENT = "edge:recentCommands";

function isShortcutId(value: unknown): value is ShortcutId {
  return typeof value === "string" && value.length > 0;
}

function readStored(): ShortcutId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_COMMANDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isShortcutId).slice(0, RECENT_COMMANDS_MAX);
  } catch {
    return [];
  }
}

function writeStored(ids: ShortcutId[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(ids));
    window.dispatchEvent(
      new CustomEvent<ShortcutId[]>(RECENT_COMMANDS_EVENT, { detail: ids }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function readRecentCommands(): ShortcutId[] {
  return readStored();
}

export function pushRecentCommand(id: ShortcutId): ShortcutId[] {
  const prev = readStored().filter((entry) => entry !== id);
  const next = [id, ...prev].slice(0, RECENT_COMMANDS_MAX);
  writeStored(next);
  return next;
}

export function subscribeRecentCommands(onChange: (ids: ShortcutId[]) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ShortcutId[]>).detail;
    onChange(Array.isArray(detail) ? detail : readStored());
  };

  window.addEventListener(RECENT_COMMANDS_EVENT, handler);
  return () => window.removeEventListener(RECENT_COMMANDS_EVENT, handler);
}

/** Test helper — clears persisted recent commands. */
export function clearRecentCommandsForTests(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RECENT_COMMANDS_KEY);
}
