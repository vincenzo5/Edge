-- Per-trade quality rating (1–5) for journal review.

ALTER TABLE journal_trades
  ADD COLUMN IF NOT EXISTS rating smallint;

ALTER TABLE journal_trades
  DROP CONSTRAINT IF EXISTS journal_trades_rating_check;

ALTER TABLE journal_trades
  ADD CONSTRAINT journal_trades_rating_check
  CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
