"use client";

import { useEffect, useState } from "react";
import { EdgeButton } from "../../design-system";
import EdgeModalShell from "../../design-system/EdgeModalShell";
import { LIVE_CONFIRMATION_TOKEN } from "@/lib/trading/validateOrder";
import { previewOrder, submitOrder, TradingApiError } from "@/lib/trading/tradingClient";
import { describeClosePositionAction } from "@/lib/trading/closePositionDraft";
import type { OrderDraft, OrderIntent, OrderPreview, TradingEnvironment } from "@/lib/trading/types";

type Props = {
  open: boolean;
  draft: OrderDraft | null;
  environment: TradingEnvironment;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

export function ClosePositionConfirmModal({
  open,
  draft,
  environment,
  onClose,
  onSuccess,
}: Props) {
  const [preview, setPreview] = useState<OrderPreview | null>(null);
  const [previewIntent, setPreviewIntent] = useState<OrderIntent | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !draft) {
      setPreview(null);
      setPreviewIntent(null);
      setIdempotencyKey("");
      setLoading(false);
      setSubmitting(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void previewOrder(draft)
      .then((result) => {
        if (cancelled) return;
        setPreview(result.preview);
        setPreviewIntent(result.intent);
        setIdempotencyKey(crypto.randomUUID());
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof TradingApiError ? err.message : "Preview failed. Try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, draft]);

  const actionLabel = draft ? describeClosePositionAction(draft) : "";

  const handleSubmit = async () => {
    if (!draft || !previewIntent) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitOrder({
        draft,
        idempotencyKey: idempotencyKey || crypto.randomUUID(),
        previewIntentId: previewIntent.intentId,
        // Server still requires the token for live mutations; confirm click is the UX gate.
        liveConfirmation: environment === "live" ? LIVE_CONFIRMATION_TOKEN : undefined,
      });
      await onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof TradingApiError ? err.message : "Submit failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EdgeModalShell
      open={open}
      title="Close position"
      subtitle={draft ? `${draft.symbol} · ${actionLabel}` : undefined}
      onClose={onClose}
      maxWidth="sm"
      testId="close-position-modal"
      footer={
        <div className="flex justify-end gap-2">
          <EdgeButton theme="dark" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </EdgeButton>
          <EdgeButton
            theme="dark"
            variant="destructive"
            disabled={loading || submitting || !previewIntent}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Submitting…" : loading ? "Loading…" : "Confirm close"}
          </EdgeButton>
        </div>
      }
    >
      {error ? (
        <p className="mb-2 text-[11px] text-[var(--edge-negative)]" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-[11px] text-[var(--edge-text-secondary)]">
        {environment === "live"
          ? `This will submit a live market order to flatten your ${draft?.symbol ?? "position"} position.`
          : `This will submit a market order to flatten your ${draft?.symbol ?? "position"} position.`}
      </p>

      {preview?.warnings?.length ? (
        <ul className="mt-2 space-y-1 text-[10px] text-[var(--edge-warning)]">
          {preview.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </EdgeModalShell>
  );
}
