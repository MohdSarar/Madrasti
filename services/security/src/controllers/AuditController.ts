import type { Request, Response } from "express";
import { AuditService } from "../services/AuditService.js";

const audit = new AuditService();

export async function createEvent(req: Request, res: Response) {
  const created = await audit.logEvent(req.body);
  return res.status(201).json({ success: true, data: created });
}

export async function listEvents(req: Request, res: Response) {
  const params: any = {};

  const user_id = req.query.user_id as string | undefined;
  const school_id = req.query.school_id as string | undefined;
  const event_type = req.query.event_type as string | undefined;
  const severity = req.query.severity as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  if (user_id) params.user_id = user_id;
  if (school_id) params.school_id = school_id;
  if (event_type) params.event_type = event_type;
  if (severity) params.severity = severity;
  if (from) params.from = from;
  if (to) params.to = to;

  if (req.query.limit !== undefined) params.limit = Number(req.query.limit);
  if (req.query.offset !== undefined) params.offset = Number(req.query.offset);

  const data = await audit.query(params);
  return res.json({ success: true, data });
}
