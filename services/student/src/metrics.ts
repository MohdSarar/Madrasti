import client from "prom-client";

client.collectDefaultMetrics();

export const studentsCreated = new client.Counter({
  name: "students_created_total",
  help: "Total students created",
  labelNames: ["school_id"],
});

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2],
});

export async function metricsText(): Promise<string> {
  return client.register.metrics();
}
