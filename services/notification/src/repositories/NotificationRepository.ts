import { pool } from "../db.js";

export async function createNotification(n: any) {
  const r = await pool.query(
    `INSERT INTO notifications (school_id, notification_type, channel, recipient_id, subject, body, data, priority)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'normal')) RETURNING *`,
    [n.school_id,n.notification_type,n.channel,n.recipient_id,n.subject ?? null,n.body, JSON.stringify(n.data ?? {}), n.priority ?? null]
  );
  return r.rows[0];
}

export async function updateStatus(id: string, status: string, failedReason?: string) {
  const r = await pool.query(
    `UPDATE notifications SET status=$2, sent_at=CASE WHEN $2='sent' THEN NOW() ELSE sent_at END, failed_reason=$3 WHERE id=$1 RETURNING *`,
    [id,status,failedReason ?? null]
  );
  return r.rows[0] ?? null;
}

export async function listNotifications(recipientId: string) {
  const r = await pool.query(`SELECT * FROM notifications WHERE recipient_id=$1 ORDER BY created_at DESC LIMIT 100`, [recipientId]);
  return r.rows;
}
