import type { OrderSide } from "@/lib/trading/types";

import { CLASSIC_PROTECT_TEMPLATE_ID } from "./classicProtectTemplate";
import { readLastUsedPolicyForSide } from "./lastUsedPreference";

/** Resolve template id for auto-apply on new long/short — last-used by side, else Classic Protect. */
export function resolveAutoApplyTemplateId(side: OrderSide): string {
  return readLastUsedPolicyForSide(side) ?? CLASSIC_PROTECT_TEMPLATE_ID;
}
