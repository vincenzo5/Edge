"use client";

import { useEffect, useState, type ReactNode } from "react";
import { EdgeButton, EdgeSlideOver } from "@/app/components/design-system";
import type { JournalFilterHelpersMode } from "@/lib/journal/journalFilterHelpers";
import { EMPTY_JOURNAL_FILTERS, type JournalFilters } from "@/lib/journal/journalStats";
import { JOURNAL_SETUP_VALUES } from "@/lib/journal/types";

type Props = {
  open: boolean;
  mode: JournalFilterHelpersMode;
  filters: JournalFilters;
  onClose: () => void;
  onApply: (filters: JournalFilters) => void;
};

export default function JournalFilterDrawer({ open, mode, filters, onClose, onApply }: Props) {
  const [draft, setDraft] = useState<JournalFilters>(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  function patch(partial: Partial<JournalFilters>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  function handleClearDraft() {
    setDraft({ ...EMPTY_JOURNAL_FILTERS });
  }

  function handleApply() {
    onApply({
      ...draft,
      tag: draft.tag?.trim() || undefined,
      closedFrom: draft.closedFrom?.trim() || undefined,
      closedTo: draft.closedTo?.trim() || undefined,
    });
    onClose();
  }

  return (
    <EdgeSlideOver
      open={open}
      title="Filters"
      subtitle="Refine trades by setup, tags, outcome, and date range."
      onClose={onClose}
      testId="journal-filter-drawer"
    >
      <div className="flex flex-col gap-4">
        {mode === "trades" ? (
          <Field label="Status">
            <select
              data-testid="journal-filter-drawer-status"
              className="w-full rounded border border-[var(--edge-border)] bg-transparent px-2 py-1.5 text-sm"
              value={draft.status ?? "all"}
              onChange={(event) =>
                patch({ status: event.target.value as JournalFilters["status"] })
              }
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
        ) : null}

        <Field label="Setup">
          <select
            data-testid="journal-filter-drawer-setup"
            className="w-full rounded border border-[var(--edge-border)] bg-transparent px-2 py-1.5 text-sm"
            value={draft.setup ?? "all"}
            onChange={(event) =>
              patch({
                setup: event.target.value === "all" ? "all" : (event.target.value as JournalFilters["setup"]),
              })
            }
          >
            <option value="all">All setups</option>
            {JOURNAL_SETUP_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tag">
          <input
            data-testid="journal-filter-drawer-tag"
            type="text"
            placeholder="Tag name"
            className="w-full rounded border border-[var(--edge-border)] bg-transparent px-2 py-1.5 text-sm"
            value={draft.tag ?? ""}
            onChange={(event) => patch({ tag: event.target.value || undefined })}
          />
        </Field>

        <Field label="Outcome">
          <select
            data-testid="journal-filter-drawer-outcome"
            className="w-full rounded border border-[var(--edge-border)] bg-transparent px-2 py-1.5 text-sm"
            value={draft.outcome ?? "all"}
            onChange={(event) =>
              patch({ outcome: event.target.value as JournalFilters["outcome"] })
            }
          >
            <option value="all">All outcomes</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
          </select>
        </Field>

        <div className="border-t border-[var(--edge-border-subtle)] pt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--edge-text-secondary)]">
            Custom date range
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Closed from">
              <input
                data-testid="journal-filter-drawer-closed-from"
                type="date"
                className="w-full rounded border border-[var(--edge-border)] bg-transparent px-2 py-1.5 text-sm"
                value={draft.closedFrom ?? ""}
                onChange={(event) =>
                  patch({ closedFrom: event.target.value || undefined, closedDate: undefined })
                }
              />
            </Field>
            <Field label="Closed to">
              <input
                data-testid="journal-filter-drawer-closed-to"
                type="date"
                className="w-full rounded border border-[var(--edge-border)] bg-transparent px-2 py-1.5 text-sm"
                value={draft.closedTo ?? ""}
                onChange={(event) =>
                  patch({ closedTo: event.target.value || undefined, closedDate: undefined })
                }
              />
            </Field>
          </div>
          <p className="mt-2 text-xs text-[var(--edge-text-muted)]">
            Overrides the period preset when set.
          </p>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2 border-t border-[var(--edge-border-subtle)] pt-4">
          <EdgeButton
            variant="chrome"
            data-testid="journal-filter-drawer-clear"
            onClick={handleClearDraft}
          >
            Clear
          </EdgeButton>
          <EdgeButton
            variant="primary"
            data-testid="journal-filter-drawer-apply"
            onClick={handleApply}
          >
            Apply
          </EdgeButton>
        </div>
      </div>
    </EdgeSlideOver>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="text-[var(--edge-text-secondary)]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
