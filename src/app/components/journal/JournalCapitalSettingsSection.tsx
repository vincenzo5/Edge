"use client";

import { useState } from "react";
import { PlusIcon, TrashIcon } from "../chart-chrome/ChartHeaderIcons";
import { EdgeButton, EdgeIconButton, EdgeLabeledInput } from "../design-system";
import {
  addJournalCapitalEvent,
  removeJournalCapitalEvent,
  resetJournalCapitalEvents,
  sumJournalNetDeposits,
  useJournalCapitalEvents,
} from "./useJournalCapitalEvents";

function formatUsd(value: number): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function JournalCapitalSettingsSection() {
  const events = useJournalCapitalEvents();
  const netDeposits = sumJournalNetDeposits(events);
  const [date, setDate] = useState(todayIsoDate());
  const [amount, setAmount] = useState("");

  function handleAdd() {
    const parsed = Number(amount.replace(/,/g, "").trim());
    if (!date || !Number.isFinite(parsed) || parsed <= 0) return;
    addJournalCapitalEvent({ date, amountUsd: parsed });
    setAmount("");
  }

  return (
    <section className="space-y-4" data-testid="journal-capital-settings">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--edge-text-primary)]">Capital</h3>
          <p className="mt-1 text-xs text-[var(--edge-text-secondary)]">
            Deposits and withdrawals set the capital base for Account equity % and max drawdown %.
          </p>
        </div>
        <EdgeButton
          variant="chrome"
          data-testid="journal-capital-reset"
          onClick={() => resetJournalCapitalEvents()}
        >
          Reset statement seed
        </EdgeButton>
      </div>

      <div
        className="rounded border border-[var(--edge-border-subtle)] px-3 py-2 text-sm tabular-nums"
        data-testid="journal-capital-net-total"
      >
        <span className="text-[var(--edge-text-muted)]">Net deposits: </span>
        <span className="font-medium text-[var(--edge-text-strong)]">
          {netDeposits == null ? "—" : formatUsd(netDeposits)}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[9rem] flex-1">
          <EdgeLabeledInput
            label="Date"
            density="compact"
            testId="journal-capital-date-input"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div className="min-w-[9rem] flex-1">
          <EdgeLabeledInput
            label="Amount (USD)"
            density="compact"
            testId="journal-capital-amount-input"
            value={amount}
            placeholder="e.g. 5000"
            inputMode="decimal"
            onChange={(event) => setAmount(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAdd();
              }
            }}
          />
        </div>
        <EdgeIconButton
          type="button"
          title="Add deposit"
          aria-label="Add deposit"
          data-testid="journal-capital-add"
          onClick={handleAdd}
        >
          <PlusIcon />
        </EdgeIconButton>
      </div>

      <div className="rounded border border-[var(--edge-border-subtle)]">
        {events.length === 0 ? (
          <p className="px-3 py-4 text-xs text-[var(--edge-text-muted)]">No capital events yet.</p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between gap-2 border-b border-[var(--edge-border-subtle)] px-3 py-2 last:border-b-0"
              data-testid={`journal-capital-row-${event.id}`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm tabular-nums">
                  <span className="text-[var(--edge-text-strong)]">{event.date}</span>
                  <span
                    className={
                      event.kind === "deposit"
                        ? "text-[var(--edge-positive)]"
                        : "text-[var(--edge-negative)]"
                    }
                  >
                    {event.kind === "deposit" ? "+" : "−"}
                    {formatUsd(event.amountUsd)}
                  </span>
                  {event.source === "statement_seed" ? (
                    <span className="text-xs text-[var(--edge-text-muted)]">Statement</span>
                  ) : null}
                </div>
                {event.note ? (
                  <p className="mt-0.5 truncate text-xs text-[var(--edge-text-muted)]">{event.note}</p>
                ) : null}
              </div>
              <EdgeIconButton
                type="button"
                title="Remove"
                aria-label="Remove capital event"
                data-testid={`journal-capital-remove-${event.id}`}
                onClick={() => removeJournalCapitalEvent(event.id)}
              >
                <TrashIcon />
              </EdgeIconButton>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
