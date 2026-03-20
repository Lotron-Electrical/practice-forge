/**
 * Migration: Add user_id to all content tables
 * Run: node server/src/db/migrate-user-id.js
 */

import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", "..", "..", ".env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const TABLES = [
  "settings",
  "pieces",
  "sections",
  "technical_demands",
  "exercises",
  "excerpts",
  "excerpt_rotation_log",
  "uploaded_files",
  "practice_sessions",
  "session_blocks",
  "omr_results",
  "analysis_results",
  "analysis_demands",
  "resources",
  "audio_recordings",
  "assessments",
  "auditions",
];

async function migrate() {
  const client = await pool.connect();
  try {
    // Find the first user to use as default for backfill
    const userRow = await client.query(
      "SELECT id FROM users ORDER BY created_at ASC LIMIT 1",
    );
    const defaultUserId = userRow.rows[0]?.id;
    if (!defaultUserId) {
      console.log(
        "No users found — skipping backfill. Columns will be added as nullable.",
      );
    }

    for (const table of TABLES) {
      // Check if column already exists
      const colCheck = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'user_id'`,
        [table],
      );
      if (colCheck.rows.length > 0) {
        console.log(`  ${table}: user_id already exists, skipping ADD COLUMN`);
      } else {
        console.log(`  ${table}: adding user_id column...`);
        await client.query(`ALTER TABLE ${table} ADD COLUMN user_id TEXT`);
      }

      // Backfill NULL user_ids
      if (defaultUserId) {
        const updated = await client.query(
          `UPDATE ${table} SET user_id = $1 WHERE user_id IS NULL`,
          [defaultUserId],
        );
        if (updated.rowCount > 0) {
          console.log(`  ${table}: backfilled ${updated.rowCount} rows`);
        }
      }

      // Add index if not exists
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_${table}_user_id ON ${table}(user_id)`,
      );
    }

    // Add FK constraints (skip settings since it may have global rows)
    for (const table of TABLES.filter((t) => t !== "settings")) {
      try {
        await client.query(
          `ALTER TABLE ${table} ADD CONSTRAINT fk_${table}_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`,
        );
        console.log(`  ${table}: FK constraint added`);
      } catch (err) {
        if (err.code === "23505" || err.message.includes("already exists")) {
          console.log(`  ${table}: FK constraint already exists`);
        } else {
          console.log(`  ${table}: FK constraint skipped — ${err.message}`);
        }
      }
    }

    console.log("\nMigration complete!");

    // Verify
    const nullCheck = await client.query(
      "SELECT 'pieces' as t, COUNT(*) as c FROM pieces WHERE user_id IS NULL UNION ALL SELECT 'excerpts', COUNT(*) FROM excerpts WHERE user_id IS NULL UNION ALL SELECT 'exercises', COUNT(*) FROM exercises WHERE user_id IS NULL UNION ALL SELECT 'practice_sessions', COUNT(*) FROM practice_sessions WHERE user_id IS NULL",
    );
    console.log("\nNull user_id check:");
    for (const row of nullCheck.rows) {
      console.log(`  ${row.t}: ${row.c} rows with NULL user_id`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
