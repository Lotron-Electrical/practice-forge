import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool = null;

export async function initDatabase() {
  const connectionString =
    process.env.DATABASE_URL ||
    `postgresql://postgres:${process.env.DB_PASSWORD}@db.${process.env.SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`;

  pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
  });

  // Test connection
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    console.log("Connected to PostgreSQL");
  } finally {
    client.release();
  }

  // Run schema
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  await pool.query(schema);

  // Run seed
  const seed = fs.readFileSync(path.join(__dirname, "seed.sql"), "utf-8");
  await pool.query(seed);

  console.log("Database schema and seed applied");
  return pool;
}

export function getPool() {
  if (!pool)
    throw new Error("Database not initialized. Call initDatabase() first.");
  return pool;
}
