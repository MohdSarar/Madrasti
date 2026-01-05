import client from "prom-client";

// ✅ Keep the exports your code expects
export const register = client.register;

// ✅ Metric used by middleware/metrics.ts
export const httpRequestDurationMs = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in ms",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
});

let metricsInitialized = false;

/**
 * Call once at app startup.
 * In tests, we skip default metrics to avoid open handles.
 */
export function initMetrics(): void {
  if (metricsInitialized) return;

  // ✅ IMPORTANT: avoid starting the prom-client interval in Jest
  if (process.env.NODE_ENV === "test") {
    metricsInitialized = true;
    return;
  }

  client.collectDefaultMetrics();
  metricsInitialized = true;
}

/**
 * No-op for now.
 * (prom-client in this project/version doesn’t expose a supported stop function)
 */
export function stopMetrics(): void {
  // intentionally empty
}
