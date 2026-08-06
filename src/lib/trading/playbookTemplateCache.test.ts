import { describe, expect, it } from "vitest";
import { HALF_THEN_BE_PRESET } from "@/lib/trading/playbook/presets";
import {
  mergePlaybookTemplateLibrary,
  normalizePlaybookTemplates,
} from "./playbookTemplateCache";

describe("playbookTemplateCache normalize", () => {
  it("drops null, undefined, and id-less holes", () => {
    const user = { ...HALF_THEN_BE_PRESET, id: "user_long", name: "User long" };
    const sparse = [HALF_THEN_BE_PRESET, undefined, null, { name: "no-id" }, user] as Array<
      typeof HALF_THEN_BE_PRESET | null | undefined | { name: string }
    >;

    expect(normalizePlaybookTemplates(sparse as never)).toEqual([HALF_THEN_BE_PRESET, user]);
  });

  it("merges library payloads without throwing on missing arrays", () => {
    const user = { ...HALF_THEN_BE_PRESET, id: "user_long", name: "User long" };
    expect(mergePlaybookTemplateLibrary(undefined)).toEqual([]);
    expect(
      mergePlaybookTemplateLibrary({
        presets: [HALF_THEN_BE_PRESET, undefined as never],
        userTemplates: [null as never, user],
      }),
    ).toEqual([HALF_THEN_BE_PRESET, user]);
  });
});
