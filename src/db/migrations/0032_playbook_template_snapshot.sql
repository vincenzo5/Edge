ALTER TABLE playbook_instances ADD COLUMN IF NOT EXISTS template_snapshot jsonb;
