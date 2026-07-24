-- Durable trade management playbook instances (Phase 1 attach + persist).

CREATE TABLE IF NOT EXISTS playbook_instances (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  template_id text NOT NULL,
  status text NOT NULL,
  position_plan jsonb NOT NULL,
  rule_runtimes jsonb NOT NULL,
  order_intent_id uuid,
  order_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS playbook_instances_user_account_idx
  ON playbook_instances ((position_plan->>'accountId'), user_id);

CREATE INDEX IF NOT EXISTS playbook_instances_user_status_idx
  ON playbook_instances (user_id, status);

CREATE INDEX IF NOT EXISTS playbook_instances_order_intent_idx
  ON playbook_instances (user_id, order_intent_id)
  WHERE order_intent_id IS NOT NULL;
