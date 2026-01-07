import client from "prom-client";

/**
 * Re-export register so other files can expose /metrics.
 */
export const register = client.register;

export const httpRequestDurationMs = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in ms",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
});

let defaultsStarted = false;

/**
 * Start default metrics.
 *
 * Prom-client default collection sets an interval which will keep Node alive.
 * For Jest, we skip it to avoid open handles.
 */
export function initMetrics(): void {
  if (defaultsStarted) return;

  // Jest + unit/integration tests: avoid open handles.
  if (process.env["NODE_ENV"] === "test") return;

  client.collectDefaultMetrics();
  defaultsStarted = true;
}

/**
 * Best-effort cleanup for tests/teardown.
 *
 * prom-client doesn't currently expose a public API to stop the default
 * collection interval. We therefore just clear registered metrics so repeated
 * app instantiations don't throw "A metric with the name ... has already been registered".
 */
export function resetMetricsForTests(): void {
  register.clear();
  defaultsStarted = false;
}
