-- Journal tables for IBKR fill sync, grouped trades, and trade metadata.

CREATE TABLE IF NOT EXISTS journal_fills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  exec_id text NOT NULL,
  account text,
  fill_time timestamptz NOT NULL,
  side text NOT NULL,
  quantity double precision NOT NULL,
  price double precision NOT NULL,
  avg_price double precision,
  order_id integer,
  perm_id integer,
  order_ref text,
  exchange text,
  contract jsonb NOT NULL DEFAULT '{}'::jsonb,
  commission double precision,
  commission_currency text,
  realized_pnl double precision,
  source text NOT NULL DEFAULT 'live',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, exec_id)
);

CREATE INDEX IF NOT EXISTS journal_fills_user_time_idx
  ON journal_fills (user_id, fill_time DESC);

CREATE TABLE IF NOT EXISTS journal_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  status text NOT NULL,
  direction text NOT NULL,
  symbol text NOT NULL,
  sec_type text NOT NULL,
  opened_at timestamptz NOT NULL,
  closed_at timestamptz,
  net_quantity double precision,
  avg_entry double precision,
  avg_exit double precision,
  gross_pnl double precision,
  net_pnl double precision,
  total_commission double precision,
  legs jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  setup text,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_trades_user_opened_idx
  ON journal_trades (user_id, opened_at DESC);

CREATE TABLE IF NOT EXISTS journal_trade_fills (
  trade_id uuid NOT NULL REFERENCES journal_trades(id) ON DELETE CASCADE,
  fill_id uuid NOT NULL REFERENCES journal_fills(id) ON DELETE CASCADE,
  role text NOT NULL,
  PRIMARY KEY (trade_id, fill_id)
);

CREATE INDEX IF NOT EXISTS journal_trade_fills_fill_idx
  ON journal_trade_fills (fill_id);
