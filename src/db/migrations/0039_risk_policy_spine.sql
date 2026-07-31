-- Risk policy spine (M2–M4): template slots, instance trade key, protect/schedule, partial uniques.

-- M2: template slot columns beside rules
ALTER TABLE playbook_templates
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'trade',
  ADD COLUMN IF NOT EXISTS budget jsonb,
  ADD COLUMN IF NOT EXISTS sizing jsonb,
  ADD COLUMN IF NOT EXISTS geometry jsonb,
  ADD COLUMN IF NOT EXISTS exits jsonb,
  ADD COLUMN IF NOT EXISTS gates jsonb,
  ADD COLUMN IF NOT EXISTS default_entry_schedule jsonb;

-- M3: instance denormalized trade key + policy spine fields
ALTER TABLE playbook_instances
  ADD COLUMN IF NOT EXISTS environment text,
  ADD COLUMN IF NOT EXISTS account_id text,
  ADD COLUMN IF NOT EXISTS symbol text,
  ADD COLUMN IF NOT EXISTS side text,
  ADD COLUMN IF NOT EXISTS binding_ref_kind text,
  ADD COLUMN IF NOT EXISTS binding_ref_id text,
  ADD COLUMN IF NOT EXISTS control_mode text,
  ADD COLUMN IF NOT EXISTS off_reason text,
  ADD COLUMN IF NOT EXISTS protect jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS protect_state text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS protect_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS entry_schedule jsonb,
  ADD COLUMN IF NOT EXISTS entry_order jsonb,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS armed_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS detached_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Backfill denormalized trade key from position_plan
UPDATE playbook_instances
SET
  environment = COALESCE(environment, position_plan->>'environment'),
  account_id = COALESCE(account_id, position_plan->>'accountId'),
  symbol = COALESCE(symbol, position_plan->>'symbol'),
  side = COALESCE(side, position_plan->>'side'),
  control_mode = COALESCE(
    control_mode,
    CASE WHEN status = 'paused' THEN 'paused' ELSE 'automated' END
  ),
  protect_state = COALESCE(protect_state, 'unknown')
WHERE environment IS NULL
   OR account_id IS NULL
   OR symbol IS NULL
   OR side IS NULL
   OR control_mode IS NULL
   OR protect_state IS NULL;

CREATE INDEX IF NOT EXISTS playbook_instances_user_trade_key_idx
  ON playbook_instances (user_id, environment, account_id, symbol);

CREATE INDEX IF NOT EXISTS playbook_instances_user_binding_idx
  ON playbook_instances (user_id, binding_ref_kind, binding_ref_id)
  WHERE binding_ref_kind IS NOT NULL AND binding_ref_id IS NOT NULL;

-- M4: one active policy per trade; one planned per apply surface
CREATE UNIQUE INDEX IF NOT EXISTS playbook_instances_one_active_per_trade
  ON playbook_instances (user_id, environment, account_id, symbol)
  WHERE status IN ('pending_fill', 'armed', 'paused');

CREATE UNIQUE INDEX IF NOT EXISTS playbook_instances_one_planned_per_binding
  ON playbook_instances (user_id, binding_ref_kind, binding_ref_id)
  WHERE status = 'planned';
