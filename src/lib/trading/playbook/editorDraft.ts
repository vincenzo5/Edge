import { PlaybookTemplateSchema, type PlaybookRule, type PlaybookTemplate } from "./types";

export function createPlaybookRuleDraft(priority: number): PlaybookRule {
  return {
    id: `rule_${crypto.randomUUID().slice(0, 8)}`,
    label: "New rule",
    when: { kind: "multipleOfR", multiple: 1 },
    then: { kind: "modifyStop", breakEven: true },
    once: true,
    priority,
  };
}

export function resolveTemplateExitsForDraft(template: Pick<PlaybookTemplate, "exits" | "rules">): PlaybookRule[] {
  return template.exits ?? template.rules;
}

export function validatePlaybookTemplateDraft(
  draft: Pick<PlaybookTemplate, "id" | "name" | "description" | "rules">,
): { ok: true; template: PlaybookTemplate } | { ok: false; issues: string[] } {
  const parsed = PlaybookTemplateSchema.safeParse(draft);
  if (parsed.success) {
    return { ok: true, template: parsed.data };
  }
  const issues = parsed.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "template";
    return `${path}: ${issue.message}`;
  });
  return { ok: false, issues };
}

export function validateRiskPolicyTemplateDraft(
  draft: PlaybookTemplate,
): { ok: true; template: PlaybookTemplate } | { ok: false; issues: string[] } {
  const exits = resolveTemplateExitsForDraft(draft);
  const parsed = PlaybookTemplateSchema.safeParse({
    ...draft,
    exits,
    rules: draft.rules.length > 0 ? draft.rules : exits,
    schemaVersion: draft.schemaVersion ?? 1,
    scope: draft.scope ?? "trade",
  });
  if (parsed.success) {
    return { ok: true, template: parsed.data };
  }
  const issues = parsed.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "template";
    return `${path}: ${issue.message}`;
  });
  return { ok: false, issues };
}

export function reorderPlaybookRules(rules: PlaybookRule[], fromIndex: number, toIndex: number): PlaybookRule[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return rules;
  if (fromIndex >= rules.length || toIndex >= rules.length) return rules;
  const next = [...rules];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved!);
  return next.map((rule, index) => ({ ...rule, priority: index + 1 }));
}
