import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

export const options = {
  stages: [
    { duration: __ENV.RAMP1 || "20s", target: __ENV.VUS1 ? parseInt(__ENV.VUS1, 10) : 10 },
    { duration: __ENV.RAMP2 || "30s", target: __ENV.VUS2 ? parseInt(__ENV.VUS2, 10) : 30 },
    { duration: __ENV.HOLD || "30s", target: __ENV.VUS3 ? parseInt(__ENV.VUS3, 10) : 50 },
    { duration: __ENV.COOLDOWN || "10s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.10"],
    http_req_duration: ["p(95)<1500"],
  },
};

const c2xx = new Counter("auth_login_2xx_total");
const c4xx = new Counter("auth_login_4xx_total");
const c5xx = new Counter("auth_login_5xx_total");
const t = new Trend("auth_login_duration_ms");

function env(name, fallback) {
  return (__ENV[name] && String(__ENV[name])) || fallback;
}

const BASE_URL = env("BASE_URL", "http://localhost:3000");
const TENANT_SLUG = env("TENANT_SLUG", "demo");
const EMAIL = env("EMAIL", "loadtest@madrasti.local");
const PASSWORD = env("PASSWORD", "LoadTest12345!");

export default function () {
  const url = `${BASE_URL}/v1/auth/login`;
  const payload = JSON.stringify({ email: EMAIL, password: PASSWORD });

  const res = http.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      "x-school-slug": TENANT_SLUG,
    },
    tags: { name: "auth_login" },
  });

  t.add(res.timings.duration);

  check(res, {
    "status is 2xx/4xx/5xx": (r) => r.status >= 200 && r.status < 600,
  });

  if (res.status >= 200 && res.status < 300) c2xx.add(1);
  else if (res.status >= 400 && res.status < 500) c4xx.add(1);
  else if (res.status >= 500) c5xx.add(1);

  sleep(0.2);
}
