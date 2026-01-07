import { gdprRequestsTotal } from "../metrics.js";
import { pool } from "../db.js";
import { AuditService } from "./AuditService.js";

export class ComplianceService {
  constructor(private readonly audit = new AuditService()) {}

  async gdprForget(params: { userId: string; schoolId?: string }) {
    const { userId, schoolId } = params;

    const event: any = {
      event_type: "GDPR_FORGET_REQUEST" as const,
      event_source: "security" as const,
      user_id: userId,
      action: "GDPR_FORGET" as const,
      status: "INFO" as const,
      details: { requestedAt: new Date().toISOString() },
      severity: "MEDIUM" as const,
    };
    if (schoolId) event.school_id = schoolId;

    await this.audit.logEvent(event);

    await pool.query(
      `INSERT INTO security.gdpr_requests (user_id, school_id, status, processed_at)
       VALUES ($1,$2,'processed',NOW())
       ON CONFLICT (user_id) DO UPDATE SET status='processed', processed_at=NOW()`,
      [userId, schoolId ?? null]
    );

    gdprRequestsTotal.inc({ request_type: "forget", status: "processed" });
    return { success: true, processedAt: new Date().toISOString() };
  }

  async exportUserData(params: { userId: string }) {
    await this.audit.logEvent({
      event_type: "DATA_EXPORT_REQUEST" as const,
      event_source: "security" as const,
      user_id: params.userId,
      action: "DATA_EXPORT" as const,
      status: "INFO" as const,
      details: { requestedAt: new Date().toISOString() },
      severity: "LOW" as const,
    });

    gdprRequestsTotal.inc({ request_type: "export", status: "accepted" });
    return { status: "accepted", message: "Export request accepted (orchestrated export across services is next)." };
  }
}
