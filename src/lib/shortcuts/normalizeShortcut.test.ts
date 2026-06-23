import { describe, expect, it } from "vitest";
import {
  bindingToMatchString,
  findMatchingCommand,
  matchesBinding,
  normalizedToMatchString,
  resolveShortcutCommand,
} from "./normalizeShortcut";
import type { ShortcutCommand } from "./shortcutTypes";

describe("normalizeShortcut", () => {
  it("normalizes modifier keys into match strings", () => {
    expect(bindingToMatchString({ mod: true, key: "k" })).toBe("mod+k");
    expect(bindingToMatchString({ mod: true, shift: true, key: "z" })).toBe("mod+shift+z");
    expect(bindingToMatchString({ alt: true, key: "g" })).toBe("alt+g");
  });

  it("matches keyboard events against bindings", () => {
    const normalized = {
      mod: true,
      alt: false,
      shift: false,
      key: "z",
    };
    expect(matchesBinding(normalized, { mod: true, key: "z" })).toBe(true);
    expect(matchesBinding(normalized, { mod: true, shift: true, key: "z" })).toBe(false);
  });

  it("resolves by scope priority with drawing over app", () => {
    const drawing: ShortcutCommand = {
      id: "lockDrawing",
      scope: "drawing",
      keys: [{ alt: true, key: "l" }],
      enabled: () => true,
      run: () => {},
    };
    const app: ShortcutCommand = {
      id: "toggleLinkedLayout",
      scope: "app",
      keys: [{ alt: true, key: "l" }],
      enabled: () => true,
      run: () => {},
    };

    const normalized = normalizedToMatchString({
      mod: false,
      alt: true,
      shift: false,
      key: "l",
    });

    expect(normalized).toBe("alt+l");
    expect(
      resolveShortcutCommand(
        { mod: false, alt: true, shift: false, key: "l" },
        [app, drawing],
      )?.id,
    ).toBe("lockDrawing");
  });

  it("findMatchingCommand respects enabled callbacks", () => {
    const command: ShortcutCommand = {
      id: "undo",
      scope: "chart",
      keys: [{ mod: true, key: "z" }],
      enabled: () => false,
      run: () => {},
    };

    expect(
      findMatchingCommand(
        { mod: true, alt: false, shift: false, key: "z" },
        [command],
      ),
    ).toBeNull();
  });
});
