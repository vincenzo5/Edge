CREATE TABLE user_pattern_taxonomy (
  user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE cascade,
  schema_version integer DEFAULT 1 NOT NULL,
  taxonomy jsonb NOT NULL,
  sync_revision integer DEFAULT 1 NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_pattern_records (
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE cascade,
  record_id text NOT NULL,
  record jsonb NOT NULL,
  symbol text NOT NULL,
  setup_family_id text NOT NULL,
  captured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, record_id)
);

CREATE INDEX user_pattern_records_user_captured_idx
  ON user_pattern_records (user_id, captured_at DESC);

CREATE INDEX user_pattern_records_user_symbol_idx
  ON user_pattern_records (user_id, symbol);
