import dotenv from "dotenv";

dotenv.config();
function must(name: string): string { const v=process.env[name]; if(!v) throw new Error(`Missing env var: ${name}`); return v; }
export const config={
  nodeEnv: process.env['NODE_ENV'] ?? "development",
  port: parseInt(process.env['PORT'] ?? "8084",10),
  databaseUrl: must("DATABASE_URL"),
  redisUrl: must("REDIS_URL"),
  authServiceUrl: must("AUTH_SERVICE_URL"),
  authServiceToken: must("AUTH_SERVICE_TOKEN"),
  maxBodyBytes: parseInt(process.env['MAX_BODY_BYTES'] ?? "1048576",10),
};
