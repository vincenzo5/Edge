import { describe, expect, it } from "vitest";

import { listPendingMigrations } from "./db-migrate-lib.mts";

describe("listPendingMigrations", () => {
  it("returns only migrations that have not been applied", () => {
    const files = ["0000_init.sql", "0001_screener_library.sql", "0002_next.sql"];
    const applied = new Set(["0000_init.sql"]);

    expect(listPendingMigrations(files, applied)).toEqual([
      "0001_screener_library.sql",
      "0002_next.sql",
    ]);
  });

  it("returns an empty list when everything is applied", () => {
    const files = ["0000_init.sql", "0001_screener_library.sql"];
    const applied = new Set(files);

    expect(listPendingMigrations(files, applied)).toEqual([]);
  });
});
