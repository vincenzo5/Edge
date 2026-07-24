import type { IndicatorConfig } from "@/lib/chartConfig";

export type AiIndicatorSummary =
  | {
      id: string;
      kind?: "builtin" | "script";
      name: string;
      pane: "main" | "sub";
      visible?: boolean;
      inputs?: IndicatorConfig["inputs"];
      styles?: IndicatorConfig["styles"];
    }
  | {
      id: string;
      kind: "script";
      scriptId: string;
      revision: string;
      name: string;
      pane: "main" | "sub";
      visible?: boolean;
    };

export function sanitizeIndicatorForAi(indicator: IndicatorConfig): AiIndicatorSummary {
  if (indicator.kind === "script") {
    return {
      id: indicator.id,
      kind: "script",
      scriptId: indicator.scriptId ?? "",
      revision: indicator.revision ?? "",
      name: indicator.name,
      pane: indicator.pane,
      visible: indicator.visible,
    };
  }

  return {
    id: indicator.id,
    kind: indicator.kind ?? "builtin",
    name: indicator.name,
    pane: indicator.pane,
    visible: indicator.visible,
    inputs: indicator.inputs,
    styles: indicator.styles,
  };
}

export function sanitizeIndicatorsForAi(
  indicators: IndicatorConfig[],
): AiIndicatorSummary[] {
  return indicators.map(sanitizeIndicatorForAi);
}
