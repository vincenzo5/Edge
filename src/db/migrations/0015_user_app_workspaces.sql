CREATE TABLE user_app_workspaces (
  user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE cascade,
  schema_version integer DEFAULT 1 NOT NULL,
  app_workspaces_snapshot jsonb NOT NULL,
  sync_revision integer DEFAULT 1 NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
