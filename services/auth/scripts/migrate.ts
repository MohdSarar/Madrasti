import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../src/db.js";
import { logger } from "../src/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const migrationsDir = path.resolve(__dirname, "..", "migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

  for (const f of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, f), "utf8");
    logger.info({ file: f }, "running migration");
    await pool.query(sql);
  }

  await pool.end();
  logger.info("migrations done");
}

run().catch((err) => {
  logger.error({ err: String(err?.stack ?? err) }, "migration failed");
  process.exit(1);
});
