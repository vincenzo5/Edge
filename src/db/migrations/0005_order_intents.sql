-- Durable order intents for trading idempotency and preview lifecycle.

CREATE TABLE IF NOT EXISTS order_intents (
  intent_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  draft_hash text NOT NULL,
  draft jsonb NOT NULL,
  status text NOT NULL,
  order_ref text NOT NULL,
  perm_id bigint,
  order_id bigint,
  created_at_ms bigint NOT NULL,
  updated_at_ms bigint NOT NULL,
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS order_intents_user_updated_idx
  ON order_intents (user_id, updated_at_ms DESC);
