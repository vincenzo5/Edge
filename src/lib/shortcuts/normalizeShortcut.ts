import type { KeyBinding, NormalizedShortcut, ShortcutCommand } from "./shortcutTypes";

export function normalizeKeyboardEvent(event: KeyboardEvent): NormalizedShortcut {
  return {
    mod: event.metaKey || event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    key: event.key.length === 1 ? event.key.toLowerCase() : event.key,
  };
}

export function bindingToMatchString(binding: KeyBinding): string {
  const parts: string[] = [];
  if (binding.mod) parts.push("mod");
  if (binding.alt) parts.push("alt");
  if (binding.shift) parts.push("shift");
  parts.push(binding.key.toLowerCase());
  return parts.join("+");
}

export function normalizedToMatchString(normalized: NormalizedShortcut): string {
  return bindingToMatchString({
    mod: normalized.mod,
    alt: normalized.alt,
    shift: normalized.shift,
    key: normalized.key,
  });
}

export function matchesBinding(normalized: NormalizedShortcut, binding: KeyBinding): boolean {
  return normalizedToMatchString(normalized) === bindingToMatchString(binding);
}

export function matchesCommand(normalized: NormalizedShortcut, command: ShortcutCommand): boolean {
  return command.keys.some((binding) => matchesBinding(normalized, binding));
}

const SCOPE_PRIORITY: Record<ShortcutCommand["scope"], number> = {
  modal: 0,
  drawing: 1,
  chart: 2,
  app: 3,
};

export function findMatchingCommand(
  normalized: NormalizedShortcut,
  commands: ShortcutCommand[],
  options?: { scopes?: ShortcutCommand["scope"][] },
): ShortcutCommand | null {
  const allowedScopes = options?.scopes;
  let best: ShortcutCommand | null = null;
  let bestPriority = Number.POSITIVE_INFINITY;

  for (const command of commands) {
    if (allowedScopes && !allowedScopes.includes(command.scope)) continue;
    if (command.enabled && !command.enabled()) continue;
    if (!matchesCommand(normalized, command)) continue;

    const priority = SCOPE_PRIORITY[command.scope];
    if (priority < bestPriority) {
      best = command;
      bestPriority = priority;
    }
  }

  return best;
}

export function resolveShortcutCommand(
  normalized: NormalizedShortcut,
  commands: ShortcutCommand[],
): ShortcutCommand | null {
  for (const scope of ["modal", "drawing", "chart", "app"] as const) {
    const match = findMatchingCommand(normalized, commands, { scopes: [scope] });
    if (match) return match;
  }
  return null;
}
