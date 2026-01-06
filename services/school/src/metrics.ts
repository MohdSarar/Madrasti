import client from "prom-client";

client.collectDefaultMetrics();

export const schoolsProvisioned = new client.Counter({
  name: "schools_provisioned_total",
  help: "Total schools provisioned",
  labelNames: ["plan"],
});

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
});
