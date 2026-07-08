-- Planned risk fields for R-multiple on journal trades.

ALTER TABLE journal_trades
  ADD COLUMN IF NOT EXISTS planned_risk_mode text,
  ADD COLUMN IF NOT EXISTS planned_risk_value double precision,
  ADD COLUMN IF NOT EXISTS planned_risk_usd double precision;
