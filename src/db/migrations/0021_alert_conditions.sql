ALTER TABLE alert_definitions
  ADD COLUMN IF NOT EXISTS combinator TEXT,
  ADD COLUMN IF NOT EXISTS conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS watchlist_id TEXT,
  ADD COLUMN IF NOT EXISTS symbol_state JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE alert_definitions
SET conditions = jsonb_build_array(
  jsonb_strip_nulls(
    jsonb_build_object(
      'kind', 'price',
      'operator', operator,
      'price', price,
      'priceHigh', price_high
    )
  )
)
WHERE jsonb_array_length(conditions) = 0;

CREATE INDEX IF NOT EXISTS alert_definitions_watchlist_id_idx
  ON alert_definitions (watchlist_id)
  WHERE watchlist_id IS NOT NULL;
