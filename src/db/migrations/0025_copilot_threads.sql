CREATE TABLE IF NOT EXISTS "user_copilot_threads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "app_users"("id") ON DELETE CASCADE,
  "title" text NOT NULL DEFAULT 'New chat',
  "schema_version" integer NOT NULL DEFAULT 1,
  "messages" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "sync_revision" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "archived_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "user_copilot_threads_user_updated_idx"
  ON "user_copilot_threads" ("user_id", "updated_at" DESC)
  WHERE "archived_at" IS NULL;
