ALTER TABLE playbook_instances
  ADD COLUMN IF NOT EXISTS alert_bundle_id uuid;
