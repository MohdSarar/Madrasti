import type { AuditEventInsert, AuditQuery } from "../repositories/AuditRepository.js";
import { AuditRepository } from "../repositories/AuditRepository.js";
import { securityEventsTotal } from "../metrics.js";

export class AuditService {
  constructor(private readonly repo = new AuditRepository()) {}

  async logEvent(e: AuditEventInsert) {
    const created = await this.repo.create(e);
    securityEventsTotal.inc({ event_type: e.event_type, severity: e.severity ?? "INFO" });
    return created;
  }

  async query(q: AuditQuery) {
    return this.repo.list(q);
  }
}
