import type { Request, Response } from "express";
import { createNotificationSchema } from "../validation/notify.js";
import * as repo from "../repositories/NotificationRepository.js";

export async function send(req: Request, res: Response) {
  const body = createNotificationSchema.parse(req.body);
  const created = await repo.createNotification(body);

  // Step4 dev: simulate delivery
  const updated = await repo.updateStatus(created.id, "sent").catch(() => created);
  res.status(201).json(updated);
}

export async function inbox(req: Request, res: Response) {
  const recipientId = String(req.query.recipient_id ?? "");
  if (!recipientId) return res.status(400).json({ code:"VALIDATION_ERROR", message:"recipient_id is required" });
  const rows = await repo.listNotifications(recipientId);
  res.json(rows);
}
