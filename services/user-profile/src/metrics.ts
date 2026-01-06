import client from "prom-client";

client.collectDefaultMetrics();

export const profilesUpdated = new client.Counter({
  name: "user_profiles_updated_total",
  help: "Total profile updates",
  labelNames: ["school_id"],
});

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});
