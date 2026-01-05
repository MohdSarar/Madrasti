import pg from "pg";
import { closeDb } from "../src/db";
import { closeRedis } from "../src/redis";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is missing for tests");

export const client = new pg.Client({ connectionString: databaseUrl });

async function truncateIfExists(table: string) {
  const q = `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) as ok;
  `;
  const r = await client.query(q, [table]);
  if (r.rows?.[0]?.ok) {
    await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
  }
}

beforeAll(async () => {
  await client.connect();
});

beforeEach(async () => {
  await truncateIfExists("sessions");
  await truncateIfExists("user_sessions");
  await truncateIfExists("users");
  await truncateIfExists("schools");
});

afterAll(async () => {
  // close test client first
  await client.end();

  // then close shared app resources if they were opened
  await closeRedis();
  await closeDb();
});
