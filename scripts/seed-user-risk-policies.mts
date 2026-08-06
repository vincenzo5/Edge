#!/usr/bin/env npx tsx
/**
 * One-shot: seed trader risk policies as editable user templates
 * for every app_users row (idempotent by name).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

import { Pool } from "pg";

import { buildStepTrailRules } from "../src/lib/trading/playbook/stepTrail.ts";

function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = value;
    }
  } catch {
    // fall through — DATABASE_URL may already be set
  }
}

const LONG_POLICY = {
  name: "Long half → BE → 0.5R trail",
  description:
    "1R stop / 1R target. Scale 50% at +1R, move stop to break-even, then trail 0.5R once price reaches +1.5R.",
  geometry: {
    stops: [{ rMultiple: 1 }],
    targets: [{ rMultiple: 1 }],
  },
  rules: [
    {
      id: "scale-half-1r",
      label: "Scale out 50% at +1R",
      when: { kind: "multipleOfR", multiple: 1 },
      then: { kind: "reduceQty", fraction: 0.5 },
      once: true,
      priority: 1,
    },
    {
      id: "be-after-half",
      label: "Break-even after scale",
      when: { kind: "scaleFill", ruleId: "scale-half-1r" },
      then: { kind: "modifyStop", breakEven: true },
      once: true,
      requires: ["scale-half-1r"],
      priority: 2,
    },
    {
      id: "trail-05r-after-15r",
      label: "Trail 0.5R after +1.5R",
      when: { kind: "multipleOfR", multiple: 1.5 },
      then: {
        kind: "attachTrail",
        stopLeg: { mode: "trail", trailRMultiple: 0.5 },
      },
      once: true,
      requires: ["be-after-half"],
      priority: 3,
    },
  ],
};

const SHORT_POLICY = {
  name: "Short full TP 1R",
  description: "1R stop / 1R target. Flatten the full short at +1R.",
  geometry: {
    stops: [{ rMultiple: 1 }],
    targets: [{ rMultiple: 1 }],
  },
  rules: [
    {
      id: "flatten-full-1r",
      label: "Flatten full at +1R",
      when: { kind: "multipleOfR", multiple: 1 },
      then: { kind: "flatten" },
      once: true,
      priority: 1,
    },
  ],
};

const STEP_TRAIL_025_POLICY = {
  name: "Step trail 0.25R",
  description:
    "1R stop, no hard TP. At +0.25R move stop to break-even; each further +0.25R milestone moves the stop up by 0.25R (always one step behind the last milestone, through +6R).",
  geometry: {
    stops: [{ rMultiple: 1 }],
  },
  rules: buildStepTrailRules({ stepR: 0.25, maxR: 6 }),
};

type PolicyDef = {
  name: string;
  description: string;
  geometry: { stops: Array<{ rMultiple: number }>; targets?: Array<{ rMultiple: number }> };
  rules: unknown[];
};

async function ensurePolicy(
  pool: Pool,
  userId: string,
  policy: PolicyDef,
): Promise<string> {
  const existing = await pool.query<{ id: string }>(
    `select id from playbook_templates where user_id = $1 and name = $2 limit 1`,
    [userId, policy.name],
  );
  if (existing.rows[0]) {
    return `skip ${policy.name} (${existing.rows[0].id})`;
  }

  const id = `user_${randomUUID()}`;
  const now = new Date();
  await pool.query(
    `insert into playbook_templates (
      id, user_id, name, description, rules,
      schema_version, scope, budget, sizing, geometry, exits, gates, default_entry_schedule,
      created_at, updated_at
    ) values (
      $1, $2, $3, $4, $5::jsonb,
      1, 'trade', '{"kind":"inherits"}'::jsonb, '{"kind":"inherits"}'::jsonb, $6::jsonb, $5::jsonb, null, null,
      $7, $7
    )`,
    [
      id,
      userId,
      policy.name,
      policy.description,
      JSON.stringify(policy.rules),
      JSON.stringify(policy.geometry),
      now,
    ],
  );
  return `create ${policy.name} (${id})`;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("DATABASE_URL missing — set in .env.local");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const users = await pool.query<{ id: string }>(`select id from app_users`);
    if (users.rows.length === 0) {
      console.error(
        "No app_users rows — open the app once so a dev session user exists, then re-run.",
      );
      process.exit(1);
    }

    for (const user of users.rows) {
      const results = [
        await ensurePolicy(pool, user.id, LONG_POLICY),
        await ensurePolicy(pool, user.id, SHORT_POLICY),
        await ensurePolicy(pool, user.id, STEP_TRAIL_025_POLICY),
      ];
      console.log(`${user.id}: ${results.join("; ")}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
