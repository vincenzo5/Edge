import { RiskPolicyTemplateSchema, type RiskPolicyTemplate } from "./types";

export const CLASSIC_PROTECT_TEMPLATE_ID = "classic_protect";

/** Built-in fallback when no last-used policy exists for a side. */
export function getClassicProtectTemplate(): RiskPolicyTemplate {
  return RiskPolicyTemplateSchema.parse({
    id: CLASSIC_PROTECT_TEMPLATE_ID,
    name: "Classic Protect",
    description: "Resting stop + take profit from plan geometry; break-even at 1R.",
    schemaVersion: 1,
    scope: "trade",
    budget: { kind: "inherits" },
    sizing: { kind: "inherits" },
    geometry: { stops: [{ rMultiple: 1 }], targets: [{ rMultiple: 2 }] },
    exits: [
      {
        id: "protect-stop",
        role: "protect",
        binding: "restingBroker",
        qtyScope: "full",
        when: { kind: "protectiveFill" },
        then: { kind: "notify", message: "Protect filled" },
      },
      {
        id: "be-at-1r",
        when: { kind: "multipleOfR", multiple: 1 },
        then: { kind: "modifyStop", breakEven: true },
      },
    ],
    adds: [],
    defaultEntrySchedule: { kind: "immediate" },
  });
}
