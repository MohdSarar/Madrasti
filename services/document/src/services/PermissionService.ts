import { pool } from "../db.js";

export class PermissionService {
  /**
   * Check if user has access to document
   */
  static async checkAccess(userId: string, documentId: string): Promise<boolean> {
    // 1. Check if user uploaded the document
    const docResult = await pool.query(
      'SELECT uploaded_by FROM documents WHERE id = $1',
      [documentId]
    );

    if (!docResult.rows.length) return false;
    if (docResult.rows[0]?.uploaded_by === userId) return true;

    // 2. Check explicit permissions
    const permResult = await pool.query(
      `
      SELECT 1 FROM document_permissions
      WHERE document_id = $1
        AND (
          user_id = $2
          OR role IN (
            SELECT role FROM users WHERE id = $2
          )
        )
        AND can_read = true
      LIMIT 1
      `,
      [documentId, userId]
    );

    return permResult.rows.length > 0;
  }

  /**
   * Grant permission to user
   */
  static async grantPermission(params: {
    document_id: string;
    user_id?: string;
    role?: string;
    can_read: boolean;
    can_write: boolean;
    can_delete: boolean;
  }) {
    await pool.query(
      `
      INSERT INTO document_permissions
        (document_id, user_id, role, can_read, can_write, can_delete)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (document_id, COALESCE(user_id, ''), COALESCE(role, ''))
      DO UPDATE SET
        can_read = EXCLUDED.can_read,
        can_write = EXCLUDED.can_write,
        can_delete = EXCLUDED.can_delete
      `,
      [
        params.document_id,
        params.user_id || null,
        params.role || null,
        params.can_read,
        params.can_write,
        params.can_delete,
      ]
    );
  }

  /**
   * Revoke permission
   */
  static async revokePermission(permissionId: string) {
    await pool.query('DELETE FROM document_permissions WHERE id = $1', [permissionId]);
  }
}
