import type { Request, Response } from "express";
import { createFolderSchema, createDocumentSchema } from "../validation/documents.js";
import * as repo from "../repositories/DocumentRepository.js";
import { logger } from "../logger.js";
import { S3Service, S3_BUCKET, isS3Configured } from "../services/S3Service.js";
import path from "path";

export async function createFolder(req: Request, res: Response) {
  const body = createFolderSchema.parse(req.body);
  const row = await repo.createFolder(body);
  res.status(201).json(row);
}

export async function listFolders(req: Request, res: Response) {
  const schoolId = String(req.query.school_id ?? "");
  if (!schoolId) return res.status(400).json({ code:"VALIDATION_ERROR", message:"school_id is required" });
  const rows = await repo.listFolders(schoolId);
  res.json(rows);
}

export async function createDocument(req: Request, res: Response) {
  const body = createDocumentSchema.parse(req.body);
  const row = await repo.createDocument(body);
  res.status(201).json(row);
}

export async function listDocuments(req: Request, res: Response) {
  const schoolId = String(req.query.school_id ?? "");
  if (!schoolId) return res.status(400).json({ code:"VALIDATION_ERROR", message:"school_id is required" });
  const folderId = req.query.folder_id ? String(req.query.folder_id) : undefined;
  const rows = await repo.listDocuments(schoolId, folderId);
  res.json(rows);
}

// --- STEP 4 additions: S3 upload/download with access checks ---

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

    const schoolId = String(req.headers["x-school-id"] ?? req.body.school_id ?? "");
    const userId = String(req.headers["x-user-id"] ?? req.body.uploaded_by ?? "");
    if (!schoolId || !userId) {
      return res
        .status(400)
        .json({ code: "VALIDATION_ERROR", message: "x-school-id and x-user-id are required" });
    }

    const folderId = req.body.folder_id ? String(req.body.folder_id) : null;
    const documentType = req.body.document_type ? String(req.body.document_type) : null;
    const tags = req.body.tags ? String(req.body.tags).split(",").map((s) => s.trim()).filter(Boolean) : [];

    const { key, url } = await S3Service.uploadFile(req.file, schoolId, userId);

    const doc = await repo.createDocument({
      school_id: schoolId,
      folder_id: folderId,
      file_name: req.file.originalname,
      file_size: req.file.size,
      file_type: req.file.mimetype,
      file_extension: path.extname(req.file.originalname),
      storage_key: key,
      storage_bucket: S3_BUCKET,
      storage_url: url,
      document_type: documentType,
      uploaded_by: userId,
      tags,
    } as any);

    res.status(201).json(doc);
  } catch (error) {
    logger.error({ error }, "document_upload_failed");
    res.status(500).json({ code: "UPLOAD_FAILED", message: "Failed to upload document" });
  }
}

export async function downloadDocument(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const userId = String(req.headers["x-user-id"] ?? "");
    if (!userId) {
      return res.status(400).json({ code: "VALIDATION_ERROR", message: "x-user-id is required" });
    }

    const doc = await repo.getDocumentById(id);
    if (!doc) return res.status(404).json({ code: "NOT_FOUND", message: "Document not found" });

    const hasAccess = await checkDocumentAccess(id, userId, doc);
    if (!hasAccess) return res.status(403).json({ code: "FORBIDDEN", message: "No access to this document" });

    const url = await S3Service.getDownloadUrl(doc.storage_key);
    await repo.logDownload(id, userId, String(req.ip), String(req.headers["user-agent"] ?? ""));
    res.json({ url, file_name: doc.file_name });
  } catch (error) {
    logger.error({ error }, "document_download_failed");
    res.status(500).json({ code: "DOWNLOAD_FAILED", message: "Failed to download document" });
  }
}

async function checkDocumentAccess(documentId: string, userId: string, doc: any): Promise<boolean> {
  if (doc.uploaded_by === userId) return true;
  if (doc.is_public) return true;
  const hasPermission = await repo.checkPermission(documentId, userId);
  return Boolean(hasPermission);
}

