"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EdgeButton, EdgeSelect, EdgeSlideOver } from "@/app/components/design-system";
import { fieldClass, labeledFieldClass } from "@/app/components/design-system/styles";
import type { JournalFilterHelpersMode } from "@/lib/journal/journalFilterHelpers";
import { EMPTY_JOURNAL_FILTERS, type JournalFilters } from "@/lib/journal/journalStats";
import { journalSetupSelectOptions, useJournalSetupValues } from "./useJournalSetupValues";

type Props = {
  open: boolean;
  mode: JournalFilterHelpersMode;
  filters: JournalFilters;
  onClose: () => void;
  onApply: (filters: JournalFilters) => void;
};

export default function JournalFilterDrawer({ open, mode, filters, onClose, onApply }: Props) {
  const [draft, setDraft] = useState<JournalFilters>(filters);
  const setupCatalog = useJournalSetupValues();
  const setupOptions = useMemo(() => {
    const current = draft.setup && draft.setup !== "all" ? draft.setup : null;
    return [
      { value: "all", label: "All setups" },
      ...journalSetupSelectOptions(setupCatalog, current),
    ];
  }, [draft.setup, setupCatalog]);

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
          <EdgeSelect
            testId="journal-filter-drawer-status"
            variant="field"
            density="standard"
            label="Status"
            value={draft.status ?? "all"}
            onChange={(next) => patch({ status: next as JournalFilters["status"] })}
            options={[
              { value: "all", label: "All statuses" },
              { value: "open", label: "Open" },
              { value: "closed", label: "Closed" },
            ]}
          />
        ) : null}

        <EdgeSelect
          testId="journal-filter-drawer-setup"
          variant="field"
          density="standard"
          label="Setup"
          value={draft.setup ?? "all"}
          onChange={(next) =>
            patch({
              setup: next === "all" ? "all" : (next as JournalFilters["setup"]),
            })
          }
          options={setupOptions}
        />

        <Field label="Tag">
          <input
            data-testid="journal-filter-drawer-tag"
            type="text"
            placeholder="Tag name"
            className={fieldClass({ density: "standard" })}
            value={draft.tag ?? ""}
            onChange={(event) => patch({ tag: event.target.value || undefined })}
          />
        </Field>

        <EdgeSelect
          testId="journal-filter-drawer-outcome"
          variant="field"
          density="standard"
          label="Outcome"
          value={draft.outcome ?? "all"}
          onChange={(next) => patch({ outcome: next as JournalFilters["outcome"] })}
          options={[
            { value: "all", label: "All outcomes" },
            { value: "win", label: "Wins" },
            { value: "loss", label: "Losses" },
          ]}
        />

        <EdgeSelect
          testId="journal-filter-drawer-rating"
          variant="field"
          density="standard"
          label="Rating"
          value={String(draft.rating ?? "all")}
          onChange={(next) =>
            patch({
              rating:
                next === "all"
                  ? "all"
                  : next === "unrated"
                    ? "unrated"
                    : (Number.parseInt(next, 10) as JournalFilters["rating"]),
            })
          }
          options={[
            { value: "all", label: "All ratings" },
            { value: "unrated", label: "Unrated" },
            ...([1, 2, 3, 4, 5] as const).map((value) => ({
              value: String(value),
              label: `${value} star${value === 1 ? "" : "s"}`,
            })),
          ]}
        />

        <div className="border-t border-[var(--edge-border-subtle)] pt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--edge-text-secondary)]">
            Custom date range
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Closed from">
              <input
                data-testid="journal-filter-drawer-closed-from"
                type="date"
                className={fieldClass({ density: "standard" })}
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
                className={fieldClass({ density: "standard" })}
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
    <label className={`${labeledFieldClass()} flex-col items-stretch gap-1`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
