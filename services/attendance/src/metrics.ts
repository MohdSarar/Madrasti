import client from "prom-client";

client.collectDefaultMetrics();

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method","route","status_code"],
  buckets: [0.01,0.05,0.1,0.2,0.5,1,2,5],
});

export async function metricsHandler(_req: any, res: any) {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
}