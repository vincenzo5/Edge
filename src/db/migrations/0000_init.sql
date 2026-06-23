CREATE TABLE IF NOT EXISTS "app_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text,
  "display_name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "chart_workspaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "workspace_name" text DEFAULT 'Default' NOT NULL,
  "schema_version" integer DEFAULT 1 NOT NULL,
  "chart_layout_snapshot" jsonb NOT NULL,
  "sync_revision" integer DEFAULT 1 NOT NULL,
  "is_default" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "user_watchlist_library" (
  "user_id" uuid PRIMARY KEY NOT NULL,
  "schema_version" integer DEFAULT 1 NOT NULL,
  "watchlist_snapshot" jsonb NOT NULL,
  "sync_revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "chart_template_library" (
  "user_id" uuid PRIMARY KEY NOT NULL,
  "schema_version" integer DEFAULT 1 NOT NULL,
  "template_snapshot" jsonb NOT NULL,
  "sync_revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "market_research_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "chart_workspace_id" uuid,
  "symbol" text NOT NULL,
  "chart_interval" text NOT NULL,
  "research_note_type" text NOT NULL,
  "chart_drawing_snapshot" jsonb,
  "research_thesis" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone
);

ALTER TABLE "chart_workspaces" ADD CONSTRAINT "chart_workspaces_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_watchlist_library" ADD CONSTRAINT "user_watchlist_library_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "chart_template_library" ADD CONSTRAINT "chart_template_library_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "market_research_notes" ADD CONSTRAINT "market_research_notes_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "market_research_notes" ADD CONSTRAINT "market_research_notes_chart_workspace_id_chart_workspaces_id_fk" FOREIGN KEY ("chart_workspace_id") REFERENCES "public"."chart_workspaces"("id") ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "chart_workspaces_user_default_unique"
  ON "chart_workspaces" ("user_id")
  WHERE "is_default" = true AND "archived_at" IS NULL;
