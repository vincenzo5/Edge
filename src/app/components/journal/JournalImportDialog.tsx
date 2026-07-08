"use client";

import { useState } from "react";
import { EdgeButton } from "../design-system";
import { importJournalCsvRemote } from "@/lib/persistence/client/journalClient";

type Props = {
  onImported: () => void;
};

export default function JournalImportDialog({ onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const csvText = await file.text();
      const result = await importJournalCsvRemote(csvText);
      if (!result) {
        setMessage("Import failed.");
        return;
      }
      if (result.errors && result.errors.length > 0) {
        setMessage(result.errors.join(" "));
        return;
      }
      setMessage(
        `Imported ${result.imported} fills (${result.duplicates} duplicates, ${result.skipped} skipped). Rebuilt ${result.tradesRebuilt} trades.`,
      );
      onImported();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <EdgeButton
        variant="chrome"
        data-testid="journal-import-open"
        onClick={() => setOpen(true)}
      >
        Import Flex CSV
      </EdgeButton>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          data-testid="journal-import-dialog"
        >
          <div className="w-full max-w-md rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-[var(--edge-text-strong)]">Import IB Flex CSV</h2>
            <p className="mt-2 text-xs text-[var(--edge-text-secondary)]">
              Export a Trades Flex Query from IB Account Management and upload the CSV here.
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              className="mt-3 block w-full text-xs"
              data-testid="journal-import-file"
              onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
              disabled={busy}
            />
            {message ? <p className="mt-3 text-xs text-[var(--edge-text-secondary)]">{message}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <EdgeButton variant="chrome" onClick={() => setOpen(false)}>
                Close
              </EdgeButton>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
