import { describe, expect, it } from "vitest";

import { BREAK_EVEN_PRESET } from "./presets";
import {
  createPlaybookInstance,
  lockPositionPlan,
} from "./types";
import {
  createUserPlaybookTemplateId,
  isUserPlaybookTemplateId,
  resolvePlaybookTemplateFromInstance,
  resolvePlaybookTemplateSync,
} from "./resolveTemplate";

describe("resolvePlaybookTemplate", () => {
  it("prefers instance snapshot over preset lookup", () => {
    const plan = lockPositionPlan({
      symbol: "AAPL",
      accountId: "DUP586813",
      side: "BUY",
      entry: 100,
      initialStop: 95,
      qty: 10,
      environment: "paper",
    });
    const instance = createPlaybookInstance({
      id: "inst-1",
      template: {
        ...BREAK_EVEN_PRESET,
        name: "Saved BE",
      },
      positionPlan: plan,
    });

    expect(resolvePlaybookTemplateFromInstance(instance)?.name).toBe("Saved BE");
  });

  it("falls back to preset when snapshot missing", () => {
    const plan = lockPositionPlan({
      symbol: "AAPL",
      accountId: "DUP586813",
      side: "BUY",
      entry: 100,
      initialStop: 95,
      qty: 10,
      environment: "paper",
    });
    const instance = createPlaybookInstance({
      id: "inst-1",
      template: BREAK_EVEN_PRESET,
      positionPlan: plan,
    });
    delete instance.templateSnapshot;

    expect(resolvePlaybookTemplateFromInstance(instance)?.id).toBe("break_even");
  });

  it("resolves user templates from provided list", () => {
    const userTemplate = {
      id: createUserPlaybookTemplateId(),
      name: "My BE",
      description: "Custom",
      rules: BREAK_EVEN_PRESET.rules,
    };
    expect(
      resolvePlaybookTemplateSync(userTemplate.id, { userTemplates: [userTemplate] })?.name,
    ).toBe("My BE");
  });

  it("namespaces user template ids", () => {
    const id = createUserPlaybookTemplateId();
    expect(isUserPlaybookTemplateId(id)).toBe(true);
    expect(isUserPlaybookTemplateId("break_even")).toBe(false);
  });

  it("keeps instance snapshot when user template rules are patched", async () => {
    const { createMemoryPlaybookTemplateStore } = await import("../playbookTemplateStore");
    const store = createMemoryPlaybookTemplateStore();
    const userTemplate = await store.create({ sourceTemplateId: "break_even", name: "Live BE" });
    const plan = lockPositionPlan({
      symbol: "AAPL",
      accountId: "DUP586813",
      side: "BUY",
      entry: 100,
      initialStop: 95,
      qty: 10,
      environment: "paper",
    });
    const instance = createPlaybookInstance({
      id: "inst-2",
      template: userTemplate,
      positionPlan: plan,
    });
    const snapshotRules = instance.templateSnapshot?.rules;

    await store.patch(userTemplate.id, {
      rules: [
        {
          id: "edited-be",
          label: "Edited BE",
          when: { kind: "multipleOfR", multiple: 2 },
          then: { kind: "flatten" },
          once: true,
        },
      ],
    });

    expect(resolvePlaybookTemplateFromInstance(instance)?.rules).toEqual(snapshotRules);
    expect((await store.getById(userTemplate.id))?.rules[0]?.id).toBe("edited-be");
  });
});
