-- IB order and perm IDs exceed 32-bit integer range.

ALTER TABLE journal_fills
  ALTER COLUMN order_id TYPE bigint USING order_id::bigint,
  ALTER COLUMN perm_id TYPE bigint USING perm_id::bigint;
