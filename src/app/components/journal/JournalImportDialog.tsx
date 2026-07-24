"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { UploadIcon } from "@/app/components/chart-chrome/ChartHeaderIcons";
import Tooltip from "@/app/components/Tooltip";
import { EdgeButton, EdgeIconButton, EdgeModalShell, EdgeSpinner } from "../design-system";
import {
  annotationTextClass,
  bodyTextClass,
  metadataTextClass,
} from "../design-system/styles";
import { importJournalCsvRemote } from "@/lib/persistence/client/journalClient";

type Props = {
  onImported: () => void;
  /** Toolbar default: icon. Empty-state CTAs can use text. */
  triggerVariant?: "icon" | "text";
};

type ImportStatus =
  | { kind: "idle" }
  | { kind: "busy"; fileName: string }
  | { kind: "success"; summary: string }
  | { kind: "error"; message: string };

function isCsvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".csv") || file.type === "text/csv" || file.type === "application/vnd.ms-excel";
}

export default function JournalImportDialog({
  onImported,
  triggerVariant = "icon",
}: Props) {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<ImportStatus>({ kind: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const browseButtonRef = useRef<HTMLButtonElement>(null);
  const dragDepthRef = useRef(0);

  const busy = status.kind === "busy";
  const success = status.kind === "success";

  const resetStatus = useCallback(() => {
    setStatus({ kind: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const closeDialog = useCallback(() => {
    setOpen(false);
    setDragging(false);
    dragDepthRef.current = 0;
    setHelpOpen(false);
    setStatus({ kind: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!isCsvFile(file)) {
        setStatus({
          kind: "error",
          message: "Couldn't use this file. Choose a Trades Flex CSV export.",
        });
        return;
      }
      setStatus({ kind: "busy", fileName: file.name });
      try {
        const csvText = await file.text();
        const result = await importJournalCsvRemote(csvText);
        if (!result) {
          setStatus({ kind: "error", message: "Import failed. Try again." });
          return;
        }
        if (result.errors && result.errors.length > 0) {
          setStatus({ kind: "error", message: result.errors.join(" ") });
          return;
        }
        setStatus({
          kind: "success",
          summary: `Imported ${result.imported} fills · ${result.duplicates} duplicates · ${result.tradesRebuilt} trades`,
        });
        onImported();
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [onImported],
  );

  function openDialog() {
    setStatus({ kind: "idle" });
    setDragging(false);
    dragDepthRef.current = 0;
    setHelpOpen(false);
    setOpen(true);
  }

  function onDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (busy || success) return;
    dragDepthRef.current += 1;
    setDragging(true);
  }

  function onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragging(false);
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (busy || success) return;
    event.dataTransfer.dropEffect = "copy";
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setDragging(false);
    if (busy || success) return;
    const file = event.dataTransfer.files?.[0] ?? null;
    void handleFile(file);
  }

  const defaultTrigger =
    triggerVariant === "text" ? (
      <EdgeButton variant="chrome" data-testid="journal-import-open" onClick={openDialog}>
        Import Flex CSV
      </EdgeButton>
    ) : (
      <Tooltip content="Import Flex CSV" theme="dark" side="bottom" portaled>
        <EdgeIconButton
          aria-label="Import Flex CSV"
          data-testid="journal-import-open"
          onClick={openDialog}
        >
          <UploadIcon size={16} />
        </EdgeIconButton>
      </Tooltip>
    );

  const dropzoneClass = dragging
    ? "border-[var(--edge-accent-blue)] bg-[var(--edge-accent-blue)]/10"
    : success
      ? "border-[var(--edge-positive)]/40 bg-[var(--edge-positive)]/10"
      : status.kind === "error"
        ? "border-[var(--edge-negative)]/40 bg-[var(--edge-negative)]/10"
        : "border-[var(--edge-border-subtle)] bg-[var(--edge-surface-panel)]";

  return (
    <>
      {defaultTrigger}
      <EdgeModalShell
        open={open}
        title="Import Flex CSV"
        onClose={closeDialog}
        maxWidth="sm"
        align="center"
        testId="journal-import-dialog"
        initialFocusRef={browseButtonRef}
        footer={
          success ? (
            <div className="flex justify-end gap-2">
              <EdgeButton
                variant="secondary"
                data-testid="journal-import-another"
                onClick={resetStatus}
              >
                Import another
              </EdgeButton>
              <EdgeButton variant="primary" data-testid="journal-import-done" onClick={closeDialog}>
                Done
              </EdgeButton>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <EdgeButton variant="secondary" onClick={closeDialog}>
                Cancel
              </EdgeButton>
            </div>
          )
        }
      >
        <div className="space-y-4 px-5 py-4">
          <div
            className={`rounded-[var(--edge-radius-lg)] border border-dashed px-4 py-7 text-center motion-safe:transition-[background-color,border-color] motion-safe:duration-[var(--edge-motion-fast)] ${dropzoneClass}`}
            data-testid="journal-import-dropzone"
            aria-busy={busy || undefined}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            {status.kind === "busy" ? (
              <div className="flex flex-col items-center gap-2" role="status">
                <EdgeSpinner size="sm" />
                <p className={`${bodyTextClass()} text-[var(--edge-text-primary)]`}>
                  Importing {status.fileName}…
                </p>
              </div>
            ) : status.kind === "success" ? (
              <div
                className="flex flex-col items-center gap-1"
                role="status"
                data-testid="journal-import-success"
              >
                <p className={`${bodyTextClass()} font-medium text-[var(--edge-positive)]`}>
                  Import complete
                </p>
                <p className={`${bodyTextClass()} text-[var(--edge-text-primary)]`}>
                  {status.summary}
                </p>
              </div>
            ) : status.kind === "error" ? (
              <div
                className="flex flex-col items-center gap-3"
                role="alert"
                data-testid="journal-import-error"
              >
                <p className={`${bodyTextClass()} text-[var(--edge-text-primary)]`}>
                  {status.message}
                </p>
                <EdgeButton
                  variant="secondary"
                  data-testid="journal-import-retry"
                  onClick={() => {
                    resetStatus();
                    fileInputRef.current?.click();
                  }}
                >
                  Try again
                </EdgeButton>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <span className="text-[var(--edge-text-muted)]">
                  <UploadIcon size={20} />
                </span>
                <p className={`${bodyTextClass()} text-[var(--edge-text-primary)]`}>
                  {dragging ? "Drop to import" : "Drop CSV here, or"}
                </p>
                {!dragging ? (
                  <EdgeButton
                    ref={browseButtonRef}
                    variant="secondary"
                    data-testid="journal-import-browse"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose file
                  </EdgeButton>
                ) : null}
                <p className={`${annotationTextClass()} text-[var(--edge-text-muted)]`}>
                  .csv from IB Flex Queries
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              data-testid="journal-import-file"
              onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
              disabled={busy}
            />
          </div>

          <div className="border-t border-[var(--edge-border-subtle)] pt-3">
            <button
              type="button"
              className={`edge-focus-ring flex w-full items-center gap-2 rounded-[var(--edge-radius-sm)] px-2 py-2 text-left ${metadataTextClass()} text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)]`}
              aria-expanded={helpOpen}
              data-testid="journal-import-help-toggle"
              onClick={() => setHelpOpen((prev) => !prev)}
            >
              <span className={`${annotationTextClass()} w-3 shrink-0 opacity-70`} aria-hidden>
                {helpOpen ? "▾" : "▸"}
              </span>
              How to export from Interactive Brokers
            </button>
            {helpOpen ? (
              <ol
                className={`mt-2 space-y-1.5 rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-3 py-3 ${bodyTextClass()} text-[var(--edge-text-primary)]`}
                data-testid="journal-import-help"
              >
                <li>1. Client Portal → Reports → Flex Queries</li>
                <li>2. Run a Trades query (CSV)</li>
                <li>3. Include FifoPnlRealized + Conid if you can</li>
              </ol>
            ) : null}
          </div>
        </div>
      </EdgeModalShell>
    </>
  );
}
