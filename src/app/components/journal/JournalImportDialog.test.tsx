/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const importJournalCsvRemote = vi.fn();

vi.mock("@/lib/persistence/client/journalClient", () => ({
  importJournalCsvRemote: (...args: unknown[]) => importJournalCsvRemote(...args),
}));

import JournalImportDialog from "./JournalImportDialog";

describe("JournalImportDialog", () => {
  beforeEach(() => {
    importJournalCsvRemote.mockReset();
  });

  it("opens from icon trigger with drop zone first and collapsed IB help", () => {
    render(<JournalImportDialog onImported={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Import Flex CSV" }));
    expect(screen.getByTestId("journal-import-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("journal-import-dropzone")).toBeInTheDocument();
    expect(screen.getByText(/\.csv from IB Flex Queries/)).toBeInTheDocument();
    expect(screen.queryByTestId("journal-import-help")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("journal-import-help-toggle"));
    expect(screen.getByTestId("journal-import-help")).toBeInTheDocument();
    expect(screen.getByText(/Client Portal → Reports → Flex Queries/)).toBeInTheDocument();
  });

  it("imports a dropped CSV file and shows success actions", async () => {
    const onImported = vi.fn();
    importJournalCsvRemote.mockResolvedValue({
      imported: 2,
      duplicates: 0,
      skipped: 0,
      tradesRebuilt: 1,
    });

    render(<JournalImportDialog onImported={onImported} />);
    fireEvent.click(screen.getByRole("button", { name: "Import Flex CSV" }));

    const file = new File(["a,b\n1,2"], "flex.csv", { type: "text/csv" });
    fireEvent.drop(screen.getByTestId("journal-import-dropzone"), {
      dataTransfer: { files: [file], dropEffect: "copy" },
    });

    await waitFor(() => {
      expect(importJournalCsvRemote).toHaveBeenCalledWith("a,b\n1,2");
    });
    expect(onImported).toHaveBeenCalled();
    expect(screen.getByTestId("journal-import-success")).toBeInTheDocument();
    expect(screen.getByText(/Imported 2 fills/)).toBeInTheDocument();
    expect(screen.getByTestId("journal-import-done")).toBeInTheDocument();
    expect(screen.getByTestId("journal-import-another")).toBeInTheDocument();
  });

  it("rejects non-CSV drops with retry", async () => {
    render(<JournalImportDialog onImported={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Import Flex CSV" }));

    const file = new File(["nope"], "notes.txt", { type: "text/plain" });
    fireEvent.drop(screen.getByTestId("journal-import-dropzone"), {
      dataTransfer: { files: [file], dropEffect: "copy" },
    });

    expect(importJournalCsvRemote).not.toHaveBeenCalled();
    expect(screen.getByTestId("journal-import-error")).toBeInTheDocument();
    expect(screen.getByText(/Couldn't use this file/)).toBeInTheDocument();
    expect(screen.getByTestId("journal-import-retry")).toBeInTheDocument();
  });

  it("resets to idle after Import another", async () => {
    importJournalCsvRemote.mockResolvedValue({
      imported: 1,
      duplicates: 0,
      skipped: 0,
      tradesRebuilt: 1,
    });

    render(<JournalImportDialog onImported={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Import Flex CSV" }));

    const file = new File(["a,b\n1,2"], "flex.csv", { type: "text/csv" });
    fireEvent.drop(screen.getByTestId("journal-import-dropzone"), {
      dataTransfer: { files: [file], dropEffect: "copy" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("journal-import-success")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("journal-import-another"));
    expect(screen.queryByTestId("journal-import-success")).not.toBeInTheDocument();
    expect(screen.getByTestId("journal-import-browse")).toBeInTheDocument();
  });
});
