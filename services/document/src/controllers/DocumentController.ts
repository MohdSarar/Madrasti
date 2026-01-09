import type { Request, Response } from "express";
import path from "path";
import { z } from "zod";
import * as repo from "../repositories/DocumentRepository.js";
import { logger } from "../logger.js";
import { S3Service, isS3Configured } from "../services/S3Service.js";

function getHeader(req: Request, name: string): string {
  return String(req.headers[name.toLowerCase()] ?? "");
}

function userId(req: Request): string {
  return getHeader(req, "x-user-id") || "00000000-0000-0000-0000-000000000000";
}

function schoolId(req: Request): string {
  return getHeader(req, "x-school-id") || String((req.body as any)?.school_id ?? (req.query as any)?.school_id ?? "");
}

const folderCreateSchema = z.object({
  school_id: z.string().uuid(),
  name: z.string().min(1),
  parent_folder_id: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
});

export async function createFolder(req: Request, res: Response) {
  const body = folderCreateSchema.parse(req.body);
  const row = await repo.createFolder({
    school_id: body.school_id,
    name: body.name,
    parent_folder_id: body.parent_folder_id ?? null,
    description: body.description ?? null,
    created_by: userId(req),
  });
  res.status(201).json(row);
}

export async function listFolders(req: Request, res: Response) {
  const sid = String(req.query.school_id ?? "");
  if (!sid) return res.status(400).json({ code: "VALIDATION_ERROR", message: "school_id is required" });
  const parent = (req.query.parent_folder_id as string) ?? null;
  const rows = await repo.listFolders({ schoolId: sid, parentFolderId: parent || null });
  res.json(rows);
}

const docCreateSchema = z.object({
  school_id: z.string().uuid(),
  folder_id: z.string().uuid().nullable().optional(),
  file_name: z.string().min(1),
  file_size: z.number().int().nonnegative(),
  file_type: z.string().min(1),
  file_extension: z.string().nullable().optional(),
  storage_key: z.string().min(1),
  storage_bucket: z.string().min(1),
  storage_url: z.string().url().nullable().optional(),
  document_type: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export async function createDocument(req: Request, res: Response) {
  const body = docCreateSchema.parse(req.body);
  const row = await repo.createDocument({
    school_id: body.school_id,
    folder_id: body.folder_id ?? null,
    file_name: body.file_name,
    file_size: body.file_size,
    file_type: body.file_type,
    file_extension: body.file_extension ?? null,
    storage_key: body.storage_key,
    storage_bucket: body.storage_bucket,
    storage_url: body.storage_url ?? null,
    document_type: body.document_type ?? null,
    tags: body.tags ?? null,
    uploaded_by: userId(req),
    status: "active",
  });
  res.status(201).json(row);
}

export async function listDocuments(req: Request, res: Response) {
  const sid = String(req.query.school_id ?? "");
  if (!sid) return res.status(400).json({ code: "VALIDATION_ERROR", message: "school_id is required" });
  const folderId = (req.query.folder_id as string) ?? null;
  const rows = await repo.listDocuments({ schoolId: sid, folderId: folderId || null });
  res.json(rows);
}

export async function getDocument(req: Request, res: Response) {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Document ID required" });
  }
  const doc = await repo.getDocument(id);
  if (!doc) return res.status(404).json({ code: "NOT_FOUND", message: "Document not found" });
  res.json(doc);
}

export async function deleteDocument(req: Request, res: Response) {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Document ID required" });
  }
  const deleted = await repo.deleteDocument(id);
  if (!deleted) return res.status(404).json({ code: "NOT_FOUND", message: "Document not found" });
  res.json({ success: true, id: deleted.id });
}

export async function uploadDocument(req: Request, res: Response) {
  try {
    if (!isS3Configured()) {
      return res.status(501).json({
        code: "S3_NOT_CONFIGURED",
        message: "S3 integration is not configured in this environment",
      });
    }
    if (!req.file) {
      return res.status(400).json({ code: "NO_FILE", message: "No file uploaded" });
    }

    const sid = schoolId(req);
    if (!sid) return res.status(400).json({ code: "VALIDATION_ERROR", message: "school_id is required (body or x-school-id)" });

    const uid = userId(req);

    const upload = await S3Service.uploadFile(req.file, sid, uid);
    const ext = path.extname(req.file.originalname).replace(".", "") || null;

    const body = req.body as any;
    const tags =
      (req.body as any)?.tags
        ? String((req.body as any).tags)
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : null;

    const row = await repo.createDocument({
      school_id: sid,
      folder_id: (req.body as any)?.folder_id ?? null,
      file_name: req.file.originalname,
      file_size: req.file.size,
      file_type: req.file.mimetype,
      file_extension: ext,
      storage_key: upload.key,
      storage_bucket: upload.bucket,
      storage_url: upload.url,
      document_type: (req.body as any)?.document_type ?? null,
      uploaded_by: uid,
      tags, // <= null au lieu de undefined
      status: "active",
    });



    logger.info({ document_id: row.id, school_id: sid, uploaded_by: uid }, "document_uploaded");
    res.status(201).json(row);
  } catch (error: any) {
    logger.error({ err: error?.message ?? String(error) }, "upload_failed");
    res.status(500).json({ code: "UPLOAD_FAILED", message: "Failed to upload document" });
  }
}

export async function downloadDocument(req: Request, res: Response) {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Document ID required" });
  }
  const doc = await repo.getDocument(id);
  if (!doc) return res.status(404).json({ code: "NOT_FOUND", message: "Document not found" });

  try {
    const url = await S3Service.getDownloadUrl(String(doc.storage_key), 3600);
    res.json({ url, expires_in: 3600 });
  } catch (error: any) {
    logger.error({ err: error?.message ?? String(error), document_id: id }, "download_url_failed");
    res.status(500).json({ code: "DOWNLOAD_URL_FAILED", message: "Failed to generate download URL" });
  }
}

const permissionSchema = z.object({
  permission_type: z.enum(["user", "role", "class", "public"]),
  entity_id: z.string().uuid().nullable().optional(),
  entity_type: z.string().nullable().optional(),
  access_level: z.enum(["view", "download", "edit", "delete"]),
  expires_at: z.string().datetime().nullable().optional(),
});

export async function grantPermission(req: Request, res: Response) {
  const documentId = req.params.id ?? "";
  if (!documentId) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Document ID required" });
  }
  const body = permissionSchema.parse(req.body);

  const grantedBy = userId(req);
  const created = await repo.createPermission({
    document_id: documentId,
    permission_type: body.permission_type,
    entity_id: body.entity_id ?? null,
    entity_type: body.entity_type ?? null,
    access_level: body.access_level,
    granted_by: grantedBy,
    expires_at: body.expires_at ?? null,
  });

  res.status(201).json(created);
}

export async function listPermissions(req: Request, res: Response) {
  const documentId = req.params.id ?? "";
  if (!documentId) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Document ID required" });
  }
  const rows = await repo.listPermissions(documentId);
  res.json(rows);
}

export async function revokePermission(req: Request, res: Response) {
  const permissionId = req.params.permissionId ?? "";
  if (!permissionId) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Permission ID required" });
  }
  const deleted = await repo.deletePermission(permissionId);
  if (!deleted) return res.status(404).json({ code: "NOT_FOUND", message: "Permission not found" });
  res.json({ success: true, id: deleted.id });
}

const moveSchema = z.object({
  folder_id: z.string().uuid().nullable(),
});

export async function move(req: Request, res: Response) {
  const documentId = req.params.id ?? "";
  if (!documentId) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Document ID required" });
  }
  const body = moveSchema.parse(req.body);
  const updated = await repo.moveDocument({ documentId, folderId: body.folder_id ?? null });
  if (!updated) return res.status(404).json({ code: "NOT_FOUND", message: "Document not found" });
  res.json(updated);
}


