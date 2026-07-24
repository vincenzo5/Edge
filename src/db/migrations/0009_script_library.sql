CREATE TABLE IF NOT EXISTS "user_script_library" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "app_users"("id") ON DELETE cascade,
  "schema_version" integer DEFAULT 1 NOT NULL,
  "script_library_snapshot" jsonb NOT NULL,
  "sync_revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
