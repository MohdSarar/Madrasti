import { pool } from "../db.js";

export async function createFolder(f: any) {
  const r = await pool.query(
    `INSERT INTO folders (school_id,parent_folder_id,name,description) VALUES ($1,$2,$3,$4) RETURNING *`,
    [f.school_id, f.parent_folder_id ?? null, f.name, f.description ?? null]
  );
  return r.rows[0];
}

export async function listFolders(schoolId: string) {
  const r = await pool.query(`SELECT * FROM folders WHERE school_id=$1 ORDER BY created_at DESC`, [schoolId]);
  return r.rows;
}

export async function createDocument(d: any) {
  const r = await pool.query(
    `INSERT INTO documents (school_id,folder_id,file_name,file_size,file_type,file_extension,storage_key,storage_bucket,storage_url,uploaded_by,tags,metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [d.school_id, d.folder_id ?? null, d.file_name, d.file_size, d.file_type, d.file_extension ?? null, d.storage_key, d.storage_bucket, d.storage_url ?? null, d.uploaded_by, d.tags ?? [], JSON.stringify(d.metadata ?? {})]
  );
  return r.rows[0];
}

export async function listDocuments(schoolId: string, folderId?: string) {
  const q = folderId ? `SELECT * FROM documents WHERE school_id=$1 AND folder_id=$2 ORDER BY uploaded_at DESC`
                     : `SELECT * FROM documents WHERE school_id=$1 ORDER BY uploaded_at DESC`;
  const r = folderId ? await pool.query(q,[schoolId, folderId]) : await pool.query(q,[schoolId]);
  return r.rows;
}
