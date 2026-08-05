import { stepTrailRForPolicy, stepTrailStopR } from "./policyCatalog";
import type { PolicyId, PolicySimResult } from "./types";

const EPS = 1e-9;

/**
 * Close-path policy simulator. Each `pathR` point is a confirmed daily close in R
 * from entry (plus actual exit as the final point).
 */
export function simulatePolicy(pathR: number[], policyId: PolicyId): PolicySimResult {
  if (policyId === "actual") {
    throw new Error("simulatePolicy does not simulate actual — use trade net PnL R");
  }

  let qty = 1;
  let stop = -1;
  let peak = 0;
  let armed: number | null = null;
  let hit1 = false;
  let hit2 = false;
  let realized = 0;
  let exitReason = "path end / actual window end";
  const stepTrail = stepTrailRForPolicy(policyId);

  const close = (price: number, amount: number, reason: string) => {
    if (amount <= 0 || qty <= 0) return;
    const take = Math.min(amount, qty);
    realized += take * price;
    qty -= take;
    if (qty <= EPS) {
      qty = 0;
      exitReason = reason;
    }
  };

  const armContinuous = (widthR: number) => {
    armed = widthR;
    stop = Math.max(stop, peak - widthR);
  };

  const applyStepTrail = () => {
    if (stepTrail == null) return;
    stop = Math.max(stop, stepTrailStopR(peak, stepTrail));
  };

  for (const px of pathR) {
    if (qty <= 0) break;
    peak = Math.max(peak, px);
    if (armed != null) stop = Math.max(stop, peak - armed);
    applyStepTrail();

    if (px <= stop + EPS) {
      const fill = Math.max(px, stop);
      close(fill, qty, px < stop - EPS ? "gap/through stop" : "stop");
      break;
    }

    switch (policyId) {
      case "fixed_1r":
        if (px >= 1 - EPS) close(1, qty, "TP 1R");
        break;
      case "fixed_2r":
        if (px >= 2 - EPS) close(2, qty, "TP 2R");
        break;
      case "fixed_3r":
        if (px >= 3 - EPS) close(3, qty, "TP 3R");
        break;
      case "be_only":
        if (!hit1 && px >= 1 - EPS) {
          hit1 = true;
          stop = Math.max(stop, 0);
        }
        break;
      case "half_be":
        if (!hit1 && px >= 1 - EPS) {
          hit1 = true;
          close(1, 0.5, "scale 50%@1R");
          stop = Math.max(stop, 0);
        }
        break;
      case "half_trail":
        if (!hit1 && px >= 1 - EPS) {
          hit1 = true;
          close(1, 0.5, "scale 50%@1R");
          stop = Math.max(stop, 0);
          armContinuous(0.75);
        }
        break;
      case "scale_3x":
        if (!hit1 && px >= 1 - EPS) {
          hit1 = true;
          close(1, 1 / 3, "scale 1/3@1R");
          stop = Math.max(stop, 0);
        }
        if (hit1 && !hit2 && px >= 2 - EPS && qty > 0) {
          hit2 = true;
          close(2, qty / 2, "scale 1/3@2R");
          armContinuous(0.75);
        }
        break;
      case "full_trail_wide":
        if (!hit1 && px >= 1 - EPS) {
          hit1 = true;
          armContinuous(1);
        }
        break;
      case "full_trail_tight":
        if (!hit1 && px >= 1 - EPS) {
          hit1 = true;
          armContinuous(0.5);
        }
        break;
      case "swing_harvest":
        if (!hit1 && px >= 1 - EPS) {
          hit1 = true;
          close(1, 0.4, "scale 40%@1R");
          stop = Math.max(stop, 0);
          armContinuous(0.75);
        }
        break;
      default:
        break;
    }
  }

  if (qty > 0) {
    close(pathR[pathR.length - 1] ?? 0, qty, "path end / actual window end");
  }

  return {
    realizedR: round2(realized),
    exitReason,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
