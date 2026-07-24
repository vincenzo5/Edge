CREATE TABLE IF NOT EXISTS "user_research_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "app_users"("id") ON DELETE CASCADE,
  "title" text NOT NULL DEFAULT 'Research session',
  "schema_version" integer NOT NULL DEFAULT 1,
  "question" text,
  "cards" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "links" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "thread_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "reel" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "sync_revision" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "archived_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "user_research_sessions_user_updated_idx"
  ON "user_research_sessions" ("user_id", "updated_at" DESC)
  WHERE "archived_at" IS NULL;
