export type PolicyEditorSectionId =
  | "identity"
  | "budget"
  | "sizing"
  | "geometry"
  | "exits"
  | "gates"
  | "schedule"
  | "review";

export type PolicyEditorSectionCopy = {
  label: string;
  blurb: string;
  help: string;
};

export const POLICY_EDITOR_SECTIONS: { id: PolicyEditorSectionId; label: string }[] = [
  { id: "identity", label: "Identity" },
  { id: "budget", label: "Budget" },
  { id: "sizing", label: "Sizing" },
  { id: "geometry", label: "Geometry" },
  { id: "exits", label: "Exits" },
  { id: "gates", label: "Gates" },
  { id: "schedule", label: "Schedule" },
  { id: "review", label: "Review" },
];

export const POLICY_EDITOR_SECTION_COPY: Record<PolicyEditorSectionId, PolicyEditorSectionCopy> = {
  identity: {
    label: "Identity",
    blurb: "Names this recipe and its intent.",
    help: "Shown in the Risk policies library and Manage picker.",
  },
  budget: {
    label: "Budget",
    blurb: "How much you are willing to lose on the trade.",
    help: "Caps planned dollar risk. Sizing derives quantity from budget and stop distance.",
  },
  sizing: {
    label: "Sizing",
    blurb: "How budget and stop distance become quantity.",
    help: "Stop distance divides resolved budget by entry-to-stop distance to get shares.",
  },
  geometry: {
    label: "Geometry",
    blurb: "Where the plan lives: stop and target in R.",
    help: "One R is the distance from entry to the initial stop.",
  },
  exits: {
    label: "Exits",
    blurb: "Ordered rules: Protect, take-profit, Manage, and flatten.",
    help: "Protect rests at the broker. Manage upgrades stops or size after fill inside Edge.",
  },
  gates: {
    label: "Gates",
    blurb: "Hard limits that can block or kill the trade.",
    help: "Fail closed before submit when min R:R or max qty is violated.",
  },
  schedule: {
    label: "Schedule",
    blurb: "When entry may fire: now, session event, or clock.",
    help: "Controls entry timing only. Does not move stops or Manage rules.",
  },
  review: {
    label: "Review",
    blurb: "Completeness and failure-mode summary before save.",
    help: "Trade-scoped policies need budget, geometry, and a resting Protect exit.",
  },
};

export const POLICY_EDITOR_FIELD_HELP = {
  budgetSource:
    "Inherit session budget from Risk settings, or override with a fixed dollar or NetLiq percent.",
  budgetValue: "Maximum planned loss if the initial stop is hit.",
  sizingMethod:
    "Inherit session sizing or compute shares from stop distance and resolved budget.",
  maxQty: "Optional ceiling on computed quantity.",
  stopRMultiple: "Initial stop distance as multiples of one R from entry.",
  targetRMultiple: "Optional profit target as R multiples from entry.",
  timeHorizonBars: "Optional horizon as bar count on the chart timeframe you trade (e.g. 10 on daily = 10 daily bars).",
  minRiskReward: "Block the trade when reward-to-risk is below this ratio.",
  maxQtyGate: "Block the trade when computed quantity exceeds this cap.",
  scheduleKind: "Immediate entry, next session open/close, or a specific clock time.",
  exitRole:
    "Protect = broker stop. Manage = app-driven upgrades. Take profit / flatten / hedge = other exit roles.",
  exitBinding:
    "Resting broker orders survive app downtime. Managed app rules run inside Edge after fill.",
} as const;
