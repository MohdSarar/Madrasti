export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AuditStatus = "SUCCESS" | "FAIL" | "BLOCKED" | "INFO";

export type SecurityEvent = {
  event_type: string;
  event_source: string;
  user_id?: string;
  school_id?: string;
  ip_address?: string;
  user_agent?: string;
  resource_type?: string;
  resource_id?: string;
  action: string;
  status: AuditStatus;
  details?: unknown;
  severity?: Severity;
};
