import { getPool } from "./connection.js";

/** Run a SELECT query, return array of row objects */
export async function queryAll(sql, params = []) {
  const pool = getPool();
  const result = await pool.query(sql, params);
  return result.rows;
}

/** Run a SELECT query, return first row or null */
export async function queryOne(sql, params = []) {
  const rows = await queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/** Run an INSERT/UPDATE/DELETE, return row count */
export async function execute(sql, params = []) {
  const pool = getPool();
  const result = await pool.query(sql, params);
  return result.rowCount;
}
