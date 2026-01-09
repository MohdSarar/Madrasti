import pg from "pg";
import { closeDb } from "../src/db.js";
import { closeRedis } from "../src/redis.js";

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) throw new Error("DATABASE_URL is missing for tests");

// One shared connection per Jest worker process.
export const client = new pg.Client({ connectionString: databaseUrl });

/**
 * Prevent parallel Jest workers from TRUNCATE deadlocking each other.
 * We use a Postgres advisory lock to serialize DB reset across workers.
 *
 * Any 64-bit integer works. Keep it constant across the suite.
 */
const DB_RESET_LOCK_ID = 4242424242n;

async function withDbResetLock<T>(fn: () => Promise<T>): Promise<T> {
  // pg returns bigint columns as string by default; advisory lock accepts bigint input in SQL
  await client.query("SELECT pg_advisory_lock($1::bigint)", [DB_RESET_LOCK_ID.toString()]);
  try {
    return await fn();
  } finally {
    await client.query("SELECT pg_advisory_unlock($1::bigint)", [DB_RESET_LOCK_ID.toString()]);
  }
}

async function truncateAll(): Promise<void> {
  // TRUNCATE in one statement reduces lock overhead and is more reliable than per-table truncates.
  // Use the real table names from your schema.
  await client.query(
    `TRUNCATE TABLE
        user_sessions,
        users,
        schools
     RESTART IDENTITY CASCADE`
  );
}

beforeAll(async () => {
  await client.connect();
});

beforeEach(async () => {
  // Serialize DB cleanup across parallel workers.
  await withDbResetLock(async () => {
    await truncateAll();
  });
});

afterAll(async () => {
  await client.end();
  await closeRedis();
  await closeDb();
});
