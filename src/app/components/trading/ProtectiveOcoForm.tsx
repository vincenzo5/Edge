"use client";

import { useMemo, useState } from "react";
import type { AccountPosition } from "@/lib/marketData/contracts/brokerage";
import type { TradingAccount } from "@/lib/trading/types";
import { EdgeButton } from "../design-system";
import { fieldClass } from "../design-system/styles";
import { LIVE_CONFIRMATION_TOKEN } from "@/lib/trading/validateOrder";
import { submitProtectiveOco, TradingApiError } from "@/lib/trading/tradingClient";
import {
  buildFixedStopLeg,
  buildProtectiveOcoFromLevels,
  buildTrailStopLeg,
} from "@/lib/trading/bracketPlan";
import type { BracketStopLeg, StopLegMode } from "@/lib/trading/types";
import type { PositionOrderLevels } from "@/lib/trading/positionTradeSetup";
import { directionFromDrawingName } from "@/lib/trading/positionTradeSetup";
import { lockPositionPlan } from "@/lib/trading/playbook/types";
import {
  ManagePlaybookPicker,
  type ManagePresetSelection,
} from "./ManagePlaybookPicker";

export type ProtectiveOcoFormProps = {
  position: AccountPosition;
  account: TradingAccount;
  onClose: () => void;
  onSubmitted?: () => void;
};

function levelsFromPosition(position: AccountPosition): PositionOrderLevels | null {
  const qty = Math.abs(position.position ?? 0);
  const avg = position.avgCost ?? position.marketPrice;
  if (!qty || avg == null || !Number.isFinite(avg)) return null;
  const direction = (position.position ?? 0) > 0 ? "long" : "short";
  const side = direction === "long" ? "BUY" : "SELL";
  const stop = direction === "long" ? avg * 0.98 : avg * 1.02;
  const target = direction === "long" ? avg * 1.04 : avg * 0.96;
  return {
    direction,
    side,
    entry: avg,
    stop,
    target,
    riskRewardRatio: 2,
  };
}

export function ProtectiveOcoForm({
  position,
  account,
  onClose,
  onSubmitted,
}: ProtectiveOcoFormProps) {
  const symbol = position.contract.symbol?.trim().toUpperCase() ?? "";
  const quantity = Math.abs(position.position ?? 0);
  const baseLevels = useMemo(() => levelsFromPosition(position), [position]);
  const [stopPrice, setStopPrice] = useState(baseLevels ? String(baseLevels.stop) : "");
  const [takeProfitPrice, setTakeProfitPrice] = useState(
    baseLevels ? String(baseLevels.target) : "",
  );
  const [stopLegMode, setStopLegMode] = useState<StopLegMode>("fixed");
  const [trailAmount, setTrailAmount] = useState("");
  const [trailPercent, setTrailPercent] = useState("");
  const [outsideRth, setOutsideRth] = useState(false);
  const [managePresetId, setManagePresetId] = useState<ManagePresetSelection>("off");
  const [manageNotifyAtManageLevels, setManageNotifyAtManageLevels] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [liveConfirmText, setLiveConfirmText] = useState("");

  const stopLeg = useMemo((): BracketStopLeg | null => {
    if (stopLegMode === "trail") {
      const amount = Number.parseFloat(trailAmount);
      const percent = Number.parseFloat(trailPercent);
      if (Number.isFinite(amount) && amount > 0) {
        return buildTrailStopLeg({ trailAmount: amount });
      }
      if (Number.isFinite(percent) && percent > 0) {
        return buildTrailStopLeg({ trailPercent: percent });
      }
      return null;
    }
    const stop = Number.parseFloat(stopPrice);
    if (!Number.isFinite(stop) || stop <= 0) return null;
    return buildFixedStopLeg(stop);
  }, [stopLegMode, stopPrice, trailAmount, trailPercent]);

  const managePreviewPlan = useMemo(() => {
    if (!baseLevels || managePresetId === "off") return null;
    const initialStop =
      stopLeg?.stopPrice ??
      (Number.isFinite(Number.parseFloat(stopPrice)) ? Number.parseFloat(stopPrice) : baseLevels.stop);
    return lockPositionPlan({
      symbol,
      accountId: account.accountId,
      side: baseLevels.side,
      entry: baseLevels.entry,
      initialStop,
      qty: quantity,
      environment: account.environment,
    });
  }, [account.accountId, account.environment, baseLevels, managePresetId, quantity, stopLeg, stopPrice, symbol]);

  const handleSubmit = async () => {
    const tp = Number.parseFloat(takeProfitPrice);
    if (!stopLeg || !Number.isFinite(tp) || tp <= 0 || !symbol || quantity <= 0) {
      setError("Complete stop and take-profit prices.");
      return;
    }
    if (account.environment === "live" && liveConfirmText.trim() !== LIVE_CONFIRMATION_TOKEN) {
      setError(`Type ${LIVE_CONFIRMATION_TOKEN} to submit live protective OCO.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const direction =
        directionFromDrawingName((position.position ?? 0) > 0 ? "long_position" : "short_position") ??
        "long";
      const resolvedStop =
        stopLeg.stopPrice ?? (Number.isFinite(Number.parseFloat(stopPrice)) ? Number.parseFloat(stopPrice) : baseLevels?.stop ?? 0);
      const plan = buildProtectiveOcoFromLevels({
        accountId: account.accountId,
        symbol,
        quantity,
        planLevels: {
          direction,
          side: direction === "long" ? "BUY" : "SELL",
          entry: position.avgCost ?? tp,
          stop: resolvedStop,
          target: tp,
          riskRewardRatio: null,
        },
        environment: account.environment,
        outsideRth,
        stopLeg,
      });
      plan.takeProfitPrice = tp;

      const manageEnabled = managePresetId !== "off";
      const result = await submitProtectiveOco({
        plan,
        idempotencyKey: crypto.randomUUID(),
        liveConfirmation:
          account.environment === "live" ? LIVE_CONFIRMATION_TOKEN : undefined,
        ...(manageEnabled && managePreviewPlan
          ? {
              playbookTemplateId: managePresetId,
              playbookEntryPrice: managePreviewPlan.entry,
              playbookInitialStop: managePreviewPlan.initialStop,
              playbookNotifyAtManageLevels: manageNotifyAtManageLevels,
            }
          : {}),
      });
      const manageNote = result.playbookInstance
        ? ` · Manage: ${result.playbookInstance.templateId}`
        : result.playbookAttachError
          ? ` · Manage attach failed: ${result.playbookAttachError}`
          : "";
      setSuccess(
        `Protective OCO placed — stop ${result.stopOrder.orderId ?? "—"}, TP ${result.takeProfitOrder.orderId ?? "—"}${manageNote}`,
      );
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof TradingApiError ? err.message : "Protective OCO failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 px-3 py-3 text-xs" data-testid="protective-oco-form">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium text-[var(--edge-text-strong)]">
          Protect {symbol} · {quantity} sh
        </div>
        <EdgeButton theme="dark" onClick={onClose}>
          Close
        </EdgeButton>
      </div>
      {error ? <p className="text-[var(--edge-negative)]">{error}</p> : null}
      {success ? <p className="text-[var(--edge-text-strong)]">{success}</p> : null}
      <label className="block">
        <span className="text-[var(--edge-text-secondary)]">Stop price</span>
        <input
          type="number"
          step="0.01"
          className={`mt-1 ${fieldClass({ density: "standard" })}`}
          value={stopPrice}
          onChange={(event) => setStopPrice(event.target.value)}
          disabled={stopLegMode === "trail"}
        />
      </label>
      <label className="block">
        <span className="text-[var(--edge-text-secondary)]">Take profit</span>
        <input
          type="number"
          step="0.01"
          className={`mt-1 ${fieldClass({ density: "standard" })}`}
          value={takeProfitPrice}
          onChange={(event) => setTakeProfitPrice(event.target.value)}
        />
      </label>
      <div className="flex gap-2">
        <EdgeButton
          theme="dark"
          variant={stopLegMode === "fixed" ? "primary" : "secondary"}
          onClick={() => setStopLegMode("fixed")}
        >
          Fixed stop
        </EdgeButton>
        <EdgeButton
          theme="dark"
          variant={stopLegMode === "trail" ? "primary" : "secondary"}
          onClick={() => setStopLegMode("trail")}
        >
          Trail stop
        </EdgeButton>
      </div>
      {stopLegMode === "trail" ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[var(--edge-text-secondary)]">Trail $</span>
            <input
              type="number"
              step="0.01"
              className={`mt-1 ${fieldClass({ density: "standard" })}`}
              value={trailAmount}
              onChange={(event) => setTrailAmount(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-[var(--edge-text-secondary)]">Trail %</span>
            <input
              type="number"
              step="0.1"
              className={`mt-1 ${fieldClass({ density: "standard" })}`}
              value={trailPercent}
              onChange={(event) => setTrailPercent(event.target.value)}
            />
          </label>
        </div>
      ) : null}
      <ManagePlaybookPicker
        value={managePresetId}
        onChange={setManagePresetId}
        positionPlan={managePreviewPlan}
        notifyAtManageLevels={manageNotifyAtManageLevels}
        onNotifyChange={setManageNotifyAtManageLevels}
        testId="protective-oco-manage-preset"
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={outsideRth}
          onChange={(event) => setOutsideRth(event.target.checked)}
        />
        <span className="text-[var(--edge-text-secondary)]">Outside RTH</span>
      </label>
      {account.environment === "live" ? (
        <label className="block">
          <span className="text-[var(--edge-text-secondary)]">
            Type {LIVE_CONFIRMATION_TOKEN} to confirm
          </span>
          <input
            type="text"
            className="mt-1 w-full rounded border border-[var(--edge-border)] bg-transparent px-2 py-1.5 font-mono uppercase"
            value={liveConfirmText}
            onChange={(event) => setLiveConfirmText(event.target.value)}
          />
        </label>
      ) : null}
      <EdgeButton
        theme="dark"
        variant="primary"
        className="w-full"
        disabled={loading}
        onClick={() => void handleSubmit()}
      >
        {loading ? "Submitting…" : "Attach protective OCO"}
      </EdgeButton>
    </div>
  );
}
