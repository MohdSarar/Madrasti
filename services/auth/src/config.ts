import dotenv from "dotenv";

dotenv.config();

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function parseTrustProxy(v: string | undefined): false | number | string {
  // Express accepts: false | true | number | string
  // We intentionally do NOT allow boolean true via env, because it is too permissive.
  // - "0" / empty => false
  // - "1" => 1 (typical for single reverse proxy)
  // - "loopback" / "linklocal" / "uniquelocal" => allowed string values
  if (!v) return false;
  const raw = v.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no") return false;
  if (raw === "true") {
    throw new Error(
      "TRUST_PROXY=true is not allowed (too permissive). Use TRUST_PROXY=1 or TRUST_PROXY=loopback."
    );
  }
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  return raw;
}

function assertStrongSecret(name: string, value: string) {
  if (config.nodeEnv !== "production") return;
  if (value.length < 32) throw new Error(`${name} must be >= 32 chars in production`);
  if (value.toLowerCase().includes("change") || value.toLowerCase().includes("example")) {
    throw new Error(`${name} looks like a placeholder; rotate it before production`);
  }
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "8081", 10),

  // Express trust proxy.
  // - dev/local: false
  // - prod behind reverse-proxy: 1
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),

  databaseUrl: must("DATABASE_URL"),
  redisUrl: must("REDIS_URL"),

  jwt: {
    accessSecret: must("JWT_ACCESS_SECRET"),
    refreshSecret: must("JWT_REFRESH_SECRET"),
    accessTtlSeconds: parseInt(process.env.JWT_ACCESS_TTL_SECONDS ?? "900", 10),
    refreshTtlSeconds: parseInt(process.env.JWT_REFRESH_TTL_SECONDS ?? "2592000", 10),
  },

  staff2faRequired: (process.env.STAFF_2FA_REQUIRED ?? "true").toLowerCase() === "true",

  maxDevicesPerUser: parseInt(process.env.MAX_DEVICES_PER_USER ?? "3", 10),
  sessionIdleTimeoutSeconds: parseInt(process.env.SESSION_IDLE_TIMEOUT_SECONDS ?? "7200", 10),

  otpCodeTtlSeconds: parseInt(process.env.OTP_CODE_TTL_SECONDS ?? "300", 10),
};

// Secret strength checks (production only)
assertStrongSecret("JWT_ACCESS_SECRET", config.jwt.accessSecret);
assertStrongSecret("JWT_REFRESH_SECRET", config.jwt.refreshSecret);
