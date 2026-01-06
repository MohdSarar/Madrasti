import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";

export const options = {
  vus: __ENV.VUS ? parseInt(__ENV.VUS, 10) : 5,
  duration: __ENV.DURATION || "30s",
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<800"],
  },
};

const tLogin = new Trend("auth_login_duration_ms");
const cLoginOk = new Counter("auth_login_ok_total");
const cLoginFail = new Counter("auth_login_fail_total");

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

  tLogin.add(res.timings.duration);

  const ok = check(res, {
    "status is 200/401": (r) => r.status === 200 || r.status === 401,
  });

  if (!ok) cLoginFail.add(1);
  else {
    if (res.status === 200) cLoginOk.add(1);
    else cLoginFail.add(1);
  }

  sleep(1);
}
