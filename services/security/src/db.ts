import { Pool } from "pg";
import { config } from "./config.js";

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function dbHealthcheck(): Promise<void> {
  const res = await pool.query<{ now: string }>("SELECT NOW() as now");
  if (!res.rows[0]?.now) throw new Error("DB not ready");
}
