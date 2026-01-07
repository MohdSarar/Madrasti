import client from "prom-client";
client.collectDefaultMetrics();

export const securityEventsTotal = new client.Counter({
  name: "security_events_total",
  help: "Total security events logged",
  labelNames: ["event_type","severity"],
});

export const failedLoginsTotal = new client.Counter({
  name: "security_failed_logins_total",
  help: "Total failed login attempts",
  labelNames: ["school_id","reason"],
});

export const accountLockoutsTotal = new client.Counter({
  name: "security_account_lockouts_total",
  help: "Total account lockouts",
  labelNames: ["school_id","reason"],
});

export const passwordChangesTotal = new client.Counter({
  name: "security_password_changes_total",
  help: "Total password changes",
  labelNames: ["school_id","method"],
});

export const gdprRequestsTotal = new client.Counter({
  name: "gdpr_requests_total",
  help: "Total GDPR requests processed",
  labelNames: ["request_type","status"],
});

export async function metricsText() {
  return client.register.metrics();
}
