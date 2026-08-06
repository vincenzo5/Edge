import type { PlaybookRule, PlaybookTemplate } from "./types";

/** Build once-rules for a step ratchet trail (BE at first step, then lock step behind each milestone). */
export function buildStepTrailRules(args: {
  stepR: number;
  /** Highest milestone to schedule (inclusive). */
  maxR?: number;
}): PlaybookRule[] {
  const stepR = args.stepR;
  const maxR = args.maxR ?? 6;
  if (!(stepR > 0) || !(maxR >= stepR)) {
    throw new Error("buildStepTrailRules requires stepR > 0 and maxR >= stepR");
  }

  const rules: PlaybookRule[] = [];
  let priority = 1;
  for (let milestone = stepR; milestone <= maxR + 1e-9; milestone += stepR) {
    const rounded = Math.round(milestone * 1e6) / 1e6;
    const stopR = Math.round((rounded - stepR) * 1e6) / 1e6;
    const isBe = stopR <= 1e-9;
    rules.push({
      id: isBe ? `step-be-${formatR(rounded)}` : `step-lock-${formatR(rounded)}`,
      label: isBe
        ? `Break-even at +${formatR(rounded)}R`
        : `Lock +${formatR(stopR)}R at +${formatR(rounded)}R`,
      when: { kind: "multipleOfR", multiple: rounded },
      then: isBe
        ? { kind: "modifyStop", breakEven: true }
        : { kind: "modifyStop", stopRMultiple: stopR },
      once: true,
      priority: priority++,
    });
  }
  return rules;
}

function formatR(n: number): string {
  const s = n.toFixed(4).replace(/\.?0+$/, "");
  return s;
}

export function buildStepTrailPreset(args: {
  id: string;
  name: string;
  stepR: number;
  maxR?: number;
}): PlaybookTemplate {
  const step = formatR(args.stepR);
  return {
    id: args.id,
    name: args.name,
    description: `At +${step}R move stop to break-even; each further +${step}R milestone moves the stop up by ${step}R (always one step behind the last milestone). 1R initial stop; no hard target.`,
    geometry: {
      stops: [{ rMultiple: 1 }],
    },
    rules: buildStepTrailRules({ stepR: args.stepR, maxR: args.maxR }),
  };
}
