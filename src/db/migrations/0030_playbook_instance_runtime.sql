-- Phase 2 playbook manager runtime fields (stop linkage + filled qty).

ALTER TABLE playbook_instances
  ADD COLUMN IF NOT EXISTS stop_order_id integer,
  ADD COLUMN IF NOT EXISTS filled_qty integer;
