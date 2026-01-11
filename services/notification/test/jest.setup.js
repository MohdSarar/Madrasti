import { pool } from "../src/db.js";
import { redis } from "../src/redis.js";
beforeAll(async () => {
    // Start a transaction per test file (we'll rollback after each test)
    await pool.query("BEGIN");
});
afterEach(async () => {
    await pool.query("ROLLBACK");
    await pool.query("BEGIN");
    try {
        const keys = await redis.keys("test:*");
        if (keys.length)
            await redis.del(...keys);
    }
    catch {
        // Redis may not be used in some services
    }
});
afterAll(async () => {
    await pool.query("ROLLBACK");
    await pool.end();
    try {
        await redis.quit();
    }
    catch { }
});
