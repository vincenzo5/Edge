ALTER TABLE alert_definitions
  ADD COLUMN IF NOT EXISTS drawing_role TEXT,
  ADD COLUMN IF NOT EXISTS bundle_id UUID;

CREATE INDEX IF NOT EXISTS alert_definitions_bundle_id_idx
  ON alert_definitions (bundle_id)
  WHERE bundle_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS alert_definitions_drawing_role_idx
  ON alert_definitions (drawing_id, drawing_role)
  WHERE drawing_id IS NOT NULL AND drawing_role IS NOT NULL;
