-- Per-trade review flag: keep fill history but exclude from performance stats.

ALTER TABLE journal_trades
  ADD COLUMN IF NOT EXISTS ignored boolean NOT NULL DEFAULT false;
