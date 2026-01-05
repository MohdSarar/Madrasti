import pg from "pg";
import { config } from "./config.js";

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
});

export async function healthcheckDb(): Promise<void> {
  const res = await pool.query("SELECT 1 as ok");
  if (res.rows?.[0]?.ok !== 1) throw new Error("DB healthcheck failed");
}
export async function closeDb(): Promise<void> {
  await pool.end();
}
