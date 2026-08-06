import type { PlaybookTemplate } from "@/lib/trading/playbook/types";
import type { OrderSide } from "@/lib/trading/types";
import { readDefaultPolicyForSide } from "./defaultPolicyPreference";

export const DEFAULT_POSITION_TARGET_R = 2;

function targetRFromTemplate(template: PlaybookTemplate | undefined): number {
  const leg = template?.geometry?.targets?.[0];
  if (leg?.price != null && Number.isFinite(leg.price)) {
    return DEFAULT_POSITION_TARGET_R;
  }
  if (leg?.rMultiple != null && Number.isFinite(leg.rMultiple) && leg.rMultiple > 0) {
    return leg.rMultiple;
  }
  return DEFAULT_POSITION_TARGET_R;
}

/** Target R for new long/short placement from Settings default policy Geometry. */
export function resolveDefaultPositionTargetR(args: {
  side: OrderSide;
  templates: PlaybookTemplate[];
}): number {
  const templateId = readDefaultPolicyForSide(args.side);
  if (!templateId) {
    return DEFAULT_POSITION_TARGET_R;
  }
  const template = args.templates.find((item) => item.id === templateId);
  return targetRFromTemplate(template);
}
