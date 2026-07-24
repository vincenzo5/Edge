-- Max favorable / adverse excursion metrics for journal trades.

ALTER TABLE journal_trades
  ADD COLUMN IF NOT EXISTS mfe_usd double precision,
  ADD COLUMN IF NOT EXISTS mfa_usd double precision,
  ADD COLUMN IF NOT EXISTS excursion_interval text,
  ADD COLUMN IF NOT EXISTS excursion_computed_at timestamp with time zone;
