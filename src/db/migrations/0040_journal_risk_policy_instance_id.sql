ALTER TABLE journal_trades
  ADD COLUMN IF NOT EXISTS risk_policy_instance_id uuid;

CREATE INDEX IF NOT EXISTS journal_trades_risk_policy_instance_idx
  ON journal_trades (risk_policy_instance_id)
  WHERE risk_policy_instance_id IS NOT NULL;
