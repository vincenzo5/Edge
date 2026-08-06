ALTER TABLE playbook_instances
  ADD COLUMN IF NOT EXISTS manage_state jsonb,
  ADD COLUMN IF NOT EXISTS take_profit_order_id integer;

ALTER TABLE playbook_auto_manage
  ADD COLUMN IF NOT EXISTS paper_kill_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS live_kill_active boolean NOT NULL DEFAULT false;
