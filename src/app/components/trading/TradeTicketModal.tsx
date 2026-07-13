"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EdgeButton, EdgeModalShell, EdgeSegmentedTabs } from "../design-system";
import { useAccountOptional } from "../AccountProvider";
import { isGatewayTradingAccount } from "@/lib/trading/accountPickerOptions";
import { LIVE_CONFIRMATION_TOKEN } from "@/lib/trading/validateOrder";
import {
  previewOrder,
  submitOrder,
  TradingApiError,
} from "@/lib/trading/tradingClient";
import { PREVIEW_INTENT_MAX_AGE_MS } from "@/lib/trading/validateOrder";
import { findTradeForOrderRef } from "@/lib/journal/correlateOrderRef";
import { fetchJournalFills, fetchJournalTrades } from "@/lib/persistence/client/journalClient";
import type {
  OrderDraft,
  OrderIntent,
  OrderPreview,
  OrderSide,
  OrderType,
  PlacedOrderResult,
  TimeInForce,
  TradingEnvironment,
} from "@/lib/trading/types";
import Link from "next/link";

type Step = "form" | "confirm" | "success";

type Props = {
  open: boolean;
  symbol: string;
  theme?: "dark" | "light";
  initialLimitPrice?: number | null;
  onClose: () => void;
};

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildDraft(args: {
  accountId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  orderType: OrderType;
  limitPrice: string;
  stopPrice: string;
  tif: TimeInForce;
  environment: TradingEnvironment;
}): OrderDraft {
  const draft: OrderDraft = {
    accountId: args.accountId,
    symbol: args.symbol.trim().toUpperCase(),
    side: args.side,
    quantity: args.quantity,
    orderType: args.orderType,
    environment: args.environment,
    outsideRth: false,
    tif: args.tif,
  };
  if (args.orderType === "LMT" || args.orderType === "STP LMT") {
    draft.limitPrice = Number.parseFloat(args.limitPrice);
  }
  if (args.orderType === "STP" || args.orderType === "STP LMT") {
    draft.stopPrice = Number.parseFloat(args.stopPrice);
  }
  return draft;
}

function previewAgeMs(intent: OrderIntent | null): number {
  if (!intent) return Number.POSITIVE_INFINITY;
  return Date.now() - intent.updatedAt;
}

export default function TradeTicketModal({
  open,
  symbol,
  theme = "dark",
  initialLimitPrice,
  onClose,
}: Props) {
  const account = useAccountOptional();
  const accountId = account?.activeTradingAccountId ?? "";
  const gatewayAccountSelected = isGatewayTradingAccount(account?.activeTradingAccount);
  const environment = account?.tradingEnvironment ?? "paper";
  const [step, setStep] = useState<Step>("form");
  const [side, setSide] = useState<OrderSide>("BUY");
  const [quantity, setQuantity] = useState("1");
  const [orderType, setOrderType] = useState<OrderType>("MKT");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [tif, setTif] = useState<TimeInForce>("DAY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<OrderPreview | null>(null);
  const [previewIntent, setPreviewIntent] = useState<OrderIntent | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [placed, setPlaced] = useState<PlacedOrderResult | null>(null);
  const [journalTradeId, setJournalTradeId] = useState<string | null>(null);
  const [liveConfirmText, setLiveConfirmText] = useState("");

  const resetForm = useCallback(() => {
    setStep("form");
    setError(null);
    setPreview(null);
    setPreviewIntent(null);
    setIdempotencyKey("");
    setPlaced(null);
    setJournalTradeId(null);
    setQuantity("1");
    setOrderType("MKT");
    setTif("DAY");
    setLimitPrice(initialLimitPrice != null ? String(initialLimitPrice) : "");
    setStopPrice("");
    setSide("BUY");
    setLiveConfirmText("");
  }, [initialLimitPrice]);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, symbol, resetForm]);

  const draft = useMemo(() => {
    if (!gatewayAccountSelected || !accountId || !symbol.trim()) return null;
    const qty = Number.parseFloat(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return null;
    try {
      return buildDraft({
        accountId,
        symbol,
        side,
        quantity: qty,
        orderType,
        limitPrice,
        stopPrice,
        tif,
        environment,
      });
    } catch {
      return null;
    }
  }, [
    gatewayAccountSelected,
    accountId,
    symbol,
    side,
    quantity,
    orderType,
    limitPrice,
    stopPrice,
    tif,
    environment,
  ]);

  const handlePreview = async () => {
    if (!draft) {
      setError(
        !gatewayAccountSelected
          ? "Select a connected Gateway account in the header before trading."
          : accountId
            ? "Complete all required fields."
            : "Select an account in the header before trading.",
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await previewOrder(draft);
      setPreview(result.preview);
      setPreviewIntent(result.intent);
      setIdempotencyKey(crypto.randomUUID());
      setStep("confirm");
    } catch (err) {
      if (err instanceof TradingApiError) {
        const reasonText = err.reasons?.length ? ` (${err.reasons.join("; ")})` : "";
        setError(`${err.message}${reasonText}`);
      } else {
        setError("Preview failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const resolveJournalTrade = async (orderRef: string) => {
    try {
      const [fills, trades] = await Promise.all([
        fetchJournalFills(),
        fetchJournalTrades(),
      ]);
      const trade = findTradeForOrderRef(fills, trades, orderRef);
      setJournalTradeId(trade?.id ?? null);
    } catch {
      setJournalTradeId(null);
    }
  };

  const handleSubmit = async () => {
    if (!draft || !previewIntent) return;
    if (previewAgeMs(previewIntent) > PREVIEW_INTENT_MAX_AGE_MS - 5_000) {
      await handlePreview();
      setError("Preview refreshed — review and confirm again.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await submitOrder({
        draft,
        idempotencyKey: idempotencyKey || crypto.randomUUID(),
        previewIntentId: previewIntent.intentId,
        liveConfirmation:
          environment === "live" ? LIVE_CONFIRMATION_TOKEN : undefined,
      });
      setPlaced(result);
      setStep("success");
      void account?.refresh();
      void resolveJournalTrade(result.orderRef);
    } catch (err) {
      if (err instanceof TradingApiError) {
        if (err.message.toLowerCase().includes("preview expired")) {
          await handlePreview();
          setError("Preview expired — refreshed. Review and confirm again.");
          return;
        }
        const reasonText = err.reasons?.length ? ` (${err.reasons.join("; ")})` : "";
        setError(`${err.message}${reasonText}`);
      } else {
        setError("Submit failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const title =
    step === "form"
      ? `Trade ${symbol}`
      : step === "confirm"
        ? "Confirm order"
        : "Order submitted";

  const footer =
    step === "form" ? (
      <>
        <EdgeButton theme={theme} onClick={onClose}>
          Cancel
        </EdgeButton>
        <EdgeButton
          theme={theme}
          variant="primary"
          disabled={loading || !draft}
          onClick={() => void handlePreview()}
        >
          {loading ? "Previewing…" : "Preview"}
        </EdgeButton>
      </>
    ) : step === "confirm" ? (
      <>
        <EdgeButton theme={theme} onClick={() => setStep("form")} disabled={loading}>
          Back
        </EdgeButton>
        <EdgeButton
          theme={theme}
          variant="primary"
          disabled={
            loading ||
            !previewIntent ||
            (environment === "live" && liveConfirmText.trim() !== LIVE_CONFIRMATION_TOKEN)
          }
          onClick={() => void handleSubmit()}
        >
          {loading
            ? "Submitting…"
            : environment === "live"
              ? "Confirm live order"
              : "Confirm & submit"}
        </EdgeButton>
      </>
    ) : (
      <EdgeButton theme={theme} variant="primary" onClick={onClose}>
        Close
      </EdgeButton>
    );

  return (
    <EdgeModalShell
      open={open}
      title={title}
      subtitle={
        step === "form"
          ? environment === "live"
            ? "Live stock orders — real money"
            : "Paper stock orders"
          : undefined
      }
      onClose={onClose}
      maxWidth="sm"
      align="center"
      testId="trade-ticket-modal"
      footer={footer}
    >
      {error ? (
        <p className="mb-3 text-xs text-[var(--edge-negative)]" role="alert">
          {error}
        </p>
      ) : null}

      {step === "form" ? (
        <div className="space-y-3 text-xs">
          <div>
            <div className="text-[var(--edge-text-secondary)]">Account</div>
            <div className="mt-1 rounded border border-[var(--edge-border)] px-2 py-1.5 text-[var(--edge-text-strong)]">
              {gatewayAccountSelected
                ? accountId || "No account selected"
                : accountId
                  ? account?.activeTradingAccount?.availability === "offline"
                    ? `${accountId} (live offline — connect live Gateway to trade)`
                    : "Select a connected Gateway account in the header before trading."
                  : "No account selected"}
            </div>
          </div>

          <EdgeSegmentedTabs
            segments={[
              { id: "BUY", label: "Buy" },
              { id: "SELL", label: "Sell" },
            ]}
            value={side}
            onChange={(value) => setSide(value as OrderSide)}
          />

          <label className="block">
            <span className="text-[var(--edge-text-secondary)]">Quantity</span>
            <input
              type="number"
              min={1}
              step={1}
              className="mt-1 w-full rounded border border-[var(--edge-border)] bg-transparent px-2 py-1.5"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>

          <EdgeSegmentedTabs
            segments={[
              { id: "MKT", label: "Market" },
              { id: "LMT", label: "Limit" },
              { id: "STP", label: "Stop" },
              { id: "STP LMT", label: "Stop limit" },
            ]}
            value={orderType}
            onChange={(value) => setOrderType(value as OrderType)}
          />

          {orderType === "LMT" || orderType === "STP LMT" ? (
            <label className="block">
              <span className="text-[var(--edge-text-secondary)]">Limit price</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="mt-1 w-full rounded border border-[var(--edge-border)] bg-transparent px-2 py-1.5"
                value={limitPrice}
                onChange={(event) => setLimitPrice(event.target.value)}
              />
            </label>
          ) : null}

          {orderType === "STP" || orderType === "STP LMT" ? (
            <label className="block">
              <span className="text-[var(--edge-text-secondary)]">Stop price</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="mt-1 w-full rounded border border-[var(--edge-border)] bg-transparent px-2 py-1.5"
                value={stopPrice}
                onChange={(event) => setStopPrice(event.target.value)}
              />
            </label>
          ) : null}

          <EdgeSegmentedTabs
            segments={[
              { id: "DAY", label: "Day" },
              { id: "GTC", label: "GTC" },
            ]}
            value={tif}
            onChange={(value) => setTif(value as TimeInForce)}
          />
        </div>
      ) : null}

      {step === "confirm" && preview && draft ? (
        <div className="space-y-2 text-xs">
          <div className="rounded border border-[var(--edge-border)] px-3 py-2">
            <div className="font-medium text-[var(--edge-text-strong)]">
              {draft.side} {draft.quantity} {draft.symbol} · {draft.orderType}
            </div>
            <div className="mt-1 text-[var(--edge-text-secondary)]">
              Account {draft.accountId} · {draft.tif} · {draft.environment}
            </div>
          </div>
          {environment === "live" ? (
            <p className="text-[var(--edge-negative)]">
              Live order — real money. Type {LIVE_CONFIRMATION_TOKEN} below to submit.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Commission" value={formatMoney(preview.commission)} />
            <Metric
              label="Init margin Δ"
              value={formatMoney(preview.initMarginChange)}
            />
            <Metric
              label="Maint margin Δ"
              value={formatMoney(preview.maintMarginChange)}
            />
            <Metric
              label="Equity Δ"
              value={formatMoney(preview.equityWithLoanChange)}
            />
          </div>
          {preview.warnings.length > 0 ? (
            <ul className="space-y-1 text-[var(--edge-warning)]">
              {preview.warnings.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          ) : null}
          {environment === "live" ? (
            <label className="block">
              <span className="text-[var(--edge-text-secondary)]">
                Type {LIVE_CONFIRMATION_TOKEN} to confirm
              </span>
              <input
                type="text"
                className="mt-1 w-full rounded border border-[var(--edge-border)] bg-transparent px-2 py-1.5 font-mono uppercase"
                value={liveConfirmText}
                onChange={(event) => setLiveConfirmText(event.target.value)}
                autoComplete="off"
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {step === "success" && placed ? (
        <div className="space-y-2 text-xs">
          <p className="text-[var(--edge-text-strong)]">
            Order {placed.order.orderId ?? "—"} submitted on {draft?.environment ?? "paper"}{" "}
            account.
          </p>
          <div className="rounded border border-[var(--edge-border)] px-3 py-2">
            <div className="text-[var(--edge-text-secondary)]">Order ref</div>
            <div className="font-mono text-[11px] break-all">{placed.orderRef}</div>
          </div>
          {journalTradeId ? (
            <Link
              href={`/journal/trades?trade=${journalTradeId}`}
              className="inline-block text-[var(--edge-accent)] hover:underline"
            >
              View in journal
            </Link>
          ) : (
            <p className="text-[var(--edge-text-secondary)]">
              Fills sync to journal automatically when executions arrive.
            </p>
          )}
        </div>
      ) : null}
    </EdgeModalShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[var(--edge-border-subtle)] px-2 py-1.5">
      <div className="text-[10px] uppercase text-[var(--edge-text-secondary)]">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
