import { pool } from "../db.js";

export type FolderCreate = {
  school_id: string;
  name: string;
  parent_folder_id?: string | null;
  description?: string | null;
  created_by?: string | null;
};

export type DocumentCreate = {
  school_id: string;
  folder_id?: string | null;
  file_name: string;
  file_size: number;
  file_type: string;
  file_extension?: string | null;
  storage_key: string;
  storage_bucket: string;
  storage_url?: string | null;
  document_type?: string | null;
  uploaded_by: string;
  tags?: string[] | null;
  status?: string | null;
};

export async function createFolder(f: FolderCreate) {
  const r = await pool.query(
    `
    INSERT INTO folders (school_id, parent_folder_id, name, description, owner_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [f.school_id, f.parent_folder_id ?? null, f.name, f.description ?? null, f.created_by ?? null]
  );
  return r.rows[0];
}

export async function listFolders(params: { schoolId: string; parentFolderId?: string | null }) {
  const r = await pool.query(
    `
    SELECT * FROM folders
    WHERE school_id = $1
      AND parent_folder_id IS NOT DISTINCT FROM $2
    ORDER BY name
    `,
    [params.schoolId, params.parentFolderId ?? null]
  );
  return r.rows;
}

export async function createDocument(d: DocumentCreate) {
  const r = await pool.query(
    `
    INSERT INTO documents (
      school_id, folder_id, file_name, file_size, file_type, file_extension,
      storage_key, storage_bucket, storage_url, document_type, uploaded_by, tags, status
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *
    `,
    [
      d.school_id,
      d.folder_id ?? null,
      d.file_name,
      d.file_size,
      d.file_type,
      d.file_extension ?? null,
      d.storage_key,
      d.storage_bucket,
      d.storage_url ?? null,
      d.document_type ?? null,
      d.uploaded_by,
      d.tags ?? null,
      d.status ?? "active",
    ]
  );
  return r.rows[0];
}

export async function listDocuments(params: { schoolId: string; folderId?: string | null }) {
  const r = await pool.query(
    `
    SELECT * FROM documents
    WHERE school_id = $1
      AND ($2::uuid IS NULL OR folder_id = $2::uuid)
    ORDER BY uploaded_at DESC
    `,
    [params.schoolId, params.folderId ?? null]
  );
  return r.rows;
}

export async function getDocument(id: string) {
  const r = await pool.query(`SELECT * FROM documents WHERE id=$1`, [id]);
  return r.rows[0] ?? null;
}

export async function getDocumentWithPermissions(documentId: string) {
  const docResult = await pool.query(
    `SELECT * FROM documents WHERE id = $1`,
    [documentId]
  );
  
  if (!docResult.rows.length) return null;
  
  const permResult = await pool.query(
    `SELECT * FROM document_permissions WHERE document_id = $1`,
    [documentId]
  );
  
  return {
    ...docResult.rows[0],
    permissions: permResult.rows
  };
}

export async function deleteDocument(documentId: string) {
  const r = await pool.query(
    `
    DELETE FROM documents
    WHERE id = $1
    RETURNING *
    `,
    [documentId]
  );
  return r.rows[0] ?? null;
}


export async function moveDocument(params: { documentId: string; folderId: string | null }) {
  const r = await pool.query(
    `UPDATE documents SET folder_id=$2, updated_at=NOW() WHERE id=$1 RETURNING *`,
    [params.documentId, params.folderId]
  );
  return r.rows[0] ?? null;
}

export type PermissionCreate = {
  document_id: string;
  permission_type: "user" | "role" | "class" | "public";
  entity_id?: string | null;   // for user/class
  entity_type?: string | null; // for role/class type
  access_level: "view" | "download" | "edit" | "delete";
  granted_by: string;
  expires_at?: string | null;
};

export async function createPermission(p: PermissionCreate) {
  const r = await pool.query(
    `
    INSERT INTO document_permissions (
      document_id, permission_type, entity_id, entity_type, access_level, granted_by, expires_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *
    `,
    [
      p.document_id,
      p.permission_type,
      p.entity_id ?? null,
      p.entity_type ?? null,
      p.access_level,
      p.granted_by,
      p.expires_at ?? null,
    ]
  );
  return r.rows[0];
}

export async function listPermissions(documentId: string) {
  const r = await pool.query(
    `SELECT * FROM document_permissions WHERE document_id=$1 ORDER BY granted_at DESC`,
    [documentId]
  );
  return r.rows;
}

export async function deletePermission(permissionId: string) {
  const r = await pool.query(`DELETE FROM document_permissions WHERE id=$1 RETURNING id`, [permissionId]);
  return r.rows[0] ?? null;
}

