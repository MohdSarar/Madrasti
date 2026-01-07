import { pool } from "../db.js";

export type ParentRow = {
  id: string;
  school_id: string;
  first_name_ar: string;
  last_name_ar: string;
  first_name_en: string | null;
  last_name_en: string | null;
  email: string | null;
  phone: string | null;
  relationship_type: string | null;
  occupation: string | null;
  employer: string | null;
  work_phone: string | null;
  is_primary_contact: boolean;
  can_pickup_student: boolean;
  receives_notifications: boolean;
  created_at: string;
  updated_at: string;
};

export async function createParent(params: {
  schoolId: string;
  firstNameAr: string;
  lastNameAr: string;
  firstNameEn?: string | null;
  lastNameEn?: string | null;
  email?: string | null;
  phone?: string | null;
  relationshipType?: string | null;
  occupation?: string | null;
  employer?: string | null;
  workPhone?: string | null;
  isPrimaryContact?: boolean;
  canPickupStudent?: boolean;
  receivesNotifications?: boolean;
}): Promise<ParentRow> {
  const res = await pool.query(
    `INSERT INTO parents (
      school_id, first_name_ar, last_name_ar, first_name_en, last_name_en,
      email, phone, relationship_type, occupation, employer, work_phone,
      is_primary_contact, can_pickup_student, receives_notifications
    ) VALUES (
      $1,$2,$3,$4,$5,
      $6,$7,$8,$9,$10,$11,
      $12,$13,$14
    )
    RETURNING *`,
    [
      params.schoolId,
      params.firstNameAr,
      params.lastNameAr,
      params.firstNameEn ?? null,
      params.lastNameEn ?? null,
      params.email ?? null,
      params.phone ?? null,
      params.relationshipType ?? null,
      params.occupation ?? null,
      params.employer ?? null,
      params.workPhone ?? null,
      params.isPrimaryContact ?? false,
      params.canPickupStudent ?? true,
      params.receivesNotifications ?? true,
    ]
  );
  return res.rows[0] as ParentRow;
}

export async function listParents(params: {
  schoolId: string;
  limit: number;
  offset: number;
}): Promise<ParentRow[]> {
  const res = await pool.query(
    `SELECT * FROM parents
     WHERE school_id=$1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [params.schoolId, params.limit, params.offset]
  );
  return res.rows as ParentRow[];
}

export async function linkParentToStudent(params: {
  schoolId: string;
  studentId: string;
  parentId: string;
  relationshipType?: string | null;
  isPrimary?: boolean;
}): Promise<{ id: string }> {
  const res = await pool.query(
    `INSERT INTO student_parents (school_id, student_id, parent_id, relationship_type, is_primary)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (student_id, parent_id) DO UPDATE
       SET relationship_type=EXCLUDED.relationship_type,
           is_primary=EXCLUDED.is_primary
     RETURNING id`,
    [
      params.schoolId,
      params.studentId,
      params.parentId,
      params.relationshipType ?? null,
      params.isPrimary ?? false,
    ]
  );
  return res.rows[0];
}

export async function getStudentParents(params: {
  schoolId: string;
  studentId: string;
}): Promise<Array<ParentRow & { link_relationship_type: string | null; link_is_primary: boolean }>> {
  const res = await pool.query(
    `SELECT p.*,
            sp.relationship_type as link_relationship_type,
            sp.is_primary as link_is_primary
     FROM student_parents sp
     JOIN parents p ON p.id=sp.parent_id
     WHERE sp.school_id=$1 AND sp.student_id=$2
     ORDER BY sp.is_primary DESC, p.created_at DESC`,
    [params.schoolId, params.studentId]
  );
  return res.rows as any;
}
