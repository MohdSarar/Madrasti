import pg from "pg";
import { config } from "./config.js";
export const pool = new pg.Pool({ connectionString: config.DATABASE_URL });
export async function dbHealth(): Promise<boolean> { const r = await pool.query("SELECT 1 AS ok"); return r.rows?.[0]?.ok === 1; }
