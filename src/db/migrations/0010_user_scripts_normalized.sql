CREATE TABLE IF NOT EXISTS "user_scripts" (
  "user_id" uuid NOT NULL REFERENCES "app_users"("id") ON DELETE cascade,
  "script_id" uuid NOT NULL,
  "display_name" text NOT NULL,
  "head_revision" text,
  "draft_source" text,
  "draft_manifest" jsonb,
  "draft_dirty" boolean NOT NULL DEFAULT false,
  "draft_updated_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "script_id")
);

CREATE TABLE IF NOT EXISTS "user_script_revisions" (
  "user_id" uuid NOT NULL,
  "script_id" uuid NOT NULL,
  "revision" text NOT NULL,
  "source" text NOT NULL,
  "language_version" text NOT NULL,
  "sdk_version" text NOT NULL,
  "manifest" jsonb,
  "artifact_hash" text,
  "compile_ok" boolean NOT NULL,
  "compiled_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "script_id", "revision"),
  CONSTRAINT "user_script_revisions_script_fk"
    FOREIGN KEY ("user_id", "script_id")
    REFERENCES "user_scripts"("user_id", "script_id")
    ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "user_scripts_user_updated_idx"
  ON "user_scripts" ("user_id", "updated_at" DESC);
