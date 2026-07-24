-- Phase 3 playbook auto-manage consent (paper default on; live requires LIVE enable).

CREATE TABLE IF NOT EXISTS playbook_auto_manage (
  user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  paper_enabled boolean NOT NULL DEFAULT true,
  live_enabled boolean NOT NULL DEFAULT false,
  live_consent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
