import { pool } from "../db.js";

export type StudentRow = {
  id: string;
  school_id: string;
  student_code: string;
  first_name_ar: string;
  last_name_ar: string;
  date_of_birth: string;
  gender: string;
  enrollment_date: string;
  enrollment_status: string;
  current_class_id: string | null;
  current_grade_level_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function createStudent(params: {
  schoolId: string;
  studentCode: string;
  firstNameAr: string;
  lastNameAr: string;
  dateOfBirth: string;
  gender: "male" | "female";
  enrollmentDate: string;
  createdBy: string;
}): Promise<StudentRow> {
  const res = await pool.query<StudentRow>(
    `INSERT INTO students (
      school_id, student_code, first_name_ar, last_name_ar,
      date_of_birth, gender, enrollment_date, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *`,
    [
      params.schoolId,
      params.studentCode,
      params.firstNameAr,
      params.lastNameAr,
      params.dateOfBirth,
      params.gender,
      params.enrollmentDate,
      params.createdBy,
    ]
  );
  const row = res.rows[0];
  if (!row) throw new Error("createStudent: INSERT returned no row");
  return row;
}

export async function findStudentById(id: string, schoolId: string): Promise<StudentRow | null> {
  const res = await pool.query<StudentRow>(
    `SELECT * FROM students WHERE id=$1 AND school_id=$2 LIMIT 1`,
    [id, schoolId]
  );
  return res.rows[0] ?? null;
}

export async function listStudents(params: {
  schoolId: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ rows: StudentRow[]; total: number }> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 50;
  const offset = (page - 1) * limit;

  const conditions: string[] = ["school_id=$1", "enrollment_status='active'"];
  const values: any[] = [params.schoolId];
  let i = 2;

  if (params.search) {
    conditions.push(`(first_name_ar ILIKE $${i} OR last_name_ar ILIKE $${i} OR student_code ILIKE $${i})`);
    values.push(`%${params.search}%`);
    i += 1;
  }

  const where = conditions.join(" AND ");

  const countRes = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM students WHERE ${where}`,
    values
  );
  const total = parseInt(countRes.rows[0]?.count ?? "0", 10);

  values.push(limit, offset);
  const rowsRes = await pool.query<StudentRow>(
    `SELECT * FROM students WHERE ${where} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
    values
  );

  return { rows: rowsRes.rows, total };
}
