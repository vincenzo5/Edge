import { describe, expect, it } from "vitest";

import { BREAK_EVEN_PRESET } from "./playbook/presets";
import {
  createMemoryPlaybookTemplateStore,
  CreatePlaybookTemplateSchema,
} from "./playbookTemplateStore";

describe("playbookTemplateStore", () => {
  it("creates user template from preset source", async () => {
    const store = createMemoryPlaybookTemplateStore();
    const template = await store.create(
      CreatePlaybookTemplateSchema.parse({
        sourceTemplateId: "break_even",
        name: "My break-even",
      }),
    );
    expect(template.id.startsWith("user_")).toBe(true);
    expect(template.name).toBe("My break-even");
    expect(template.rules).toEqual(BREAK_EVEN_PRESET.rules);
  });

  it("renames and deletes user templates only", async () => {
    const store = createMemoryPlaybookTemplateStore();
    const created = await store.create({
      sourceTemplateId: "break_even",
    });
    const renamed = await store.patch(created.id, { name: "Renamed" });
    expect(renamed?.name).toBe("Renamed");
    expect(await store.patch("break_even", { name: "Nope" })).toBeNull();
    expect(await store.delete(created.id)).toBe(true);
    expect(await store.getById(created.id)).toBeNull();
  });

  it("duplicates preset into user library", async () => {
    const store = createMemoryPlaybookTemplateStore();
    const duplicate = await store.duplicate("half_then_be");
    expect(duplicate?.name).toContain("Half then BE");
    expect(duplicate?.id.startsWith("user_")).toBe(true);
  });

  it("patches user template rules", async () => {
    const store = createMemoryPlaybookTemplateStore();
    const created = await store.create({ sourceTemplateId: "break_even" });
    const nextRules = [
      {
        id: "custom-be",
        label: "Custom BE",
        when: { kind: "multipleOfR" as const, multiple: 1.5 },
        then: { kind: "modifyStop" as const, breakEven: true },
        once: true,
      },
    ];
    const patched = await store.patch(created.id, { rules: nextRules });
    expect(patched?.rules).toEqual(nextRules);
    expect(await store.patch("break_even", { rules: nextRules })).toBeNull();
  });

  it("patches geometry timeHorizonBars on user template", async () => {
    const store = createMemoryPlaybookTemplateStore();
    const created = await store.create({ sourceTemplateId: "break_even" });
    const patched = await store.patch(created.id, {
      geometry: { stops: [{ rMultiple: 1 }], timeHorizonBars: 10 },
    });
    expect(patched?.geometry).toEqual({
      stops: [{ rMultiple: 1 }],
      timeHorizonBars: 10,
    });
  });

  it("copies slot fields on duplicate and patches budget", async () => {
    const store = createMemoryPlaybookTemplateStore();
    const created = await store.create({
      sourceTemplateId: "break_even",
      name: "Slotted",
    });
    await store.patch(created.id, {
      budget: { kind: "dollar", value: 250 },
      geometry: { stops: [{ rMultiple: 1 }] },
    });
    const duplicate = await store.duplicate(created.id);
    expect(duplicate?.budget).toEqual({ kind: "dollar", value: 250 });
    expect(duplicate?.geometry).toEqual({ stops: [{ rMultiple: 1 }] });
  });
});
