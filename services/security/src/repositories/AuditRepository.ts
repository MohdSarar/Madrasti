import { pool } from "../db.js";

export type AuditEventInsert = {
  event_type: string;
  event_source: string;
  user_id?: string;
  school_id?: string;
  ip_address?: string;
  user_agent?: string;
  resource_type?: string;
  resource_id?: string;
  action: string;
  status: "SUCCESS" | "FAIL" | "BLOCKED" | "INFO";
  details?: unknown;
  severity?: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

export type AuditQuery = {
  user_id?: string;
  school_id?: string;
  event_type?: string;
  severity?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export class AuditRepository {
  async create(e: AuditEventInsert) {
    const q = `
      INSERT INTO security.audit_events
      (event_type,event_source,user_id,school_id,ip_address,user_agent,resource_type,resource_id,action,status,details,severity)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
      RETURNING id, created_at
    `;
    const values = [
      e.event_type,
      e.event_source,
      e.user_id ?? null,
      e.school_id ?? null,
      e.ip_address ?? null,
      e.user_agent ?? null,
      e.resource_type ?? null,
      e.resource_id ?? null,
      e.action,
      e.status,
      JSON.stringify(e.details ?? {}),
      e.severity ?? "INFO",
    ];
    const res = await pool.query(q, values);
    return res.rows[0] as { id: string; created_at: string };
  }

  async list(params: AuditQuery) {
    const where: string[] = [];
    const values: any[] = [];
    const add = (clause: string, value: any) => {
      values.push(value);
      where.push(clause.replace("?", `$${values.length}`));
    };

    if (params.user_id) add("user_id = ?", params.user_id);
    if (params.school_id) add("school_id = ?", params.school_id);
    if (params.event_type) add("event_type = ?", params.event_type);
    if (params.severity) add("severity = ?", params.severity);
    if (params.from) add("created_at >= ?::timestamptz", params.from);
    if (params.to) add("created_at <= ?::timestamptz", params.to);

    const limit = Math.min(params.limit ?? 100, 500);
    const offset = Math.max(params.offset ?? 0, 0);

    const q = `
      SELECT id,event_type,event_source,user_id,school_id,ip_address,user_agent,resource_type,resource_id,action,status,details,severity,created_at
      FROM security.audit_events
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    const res = await pool.query(q, [...values, limit, offset]);
    return res.rows;
  }
}
