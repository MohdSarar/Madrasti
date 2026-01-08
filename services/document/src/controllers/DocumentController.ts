import type { Request, Response } from "express";
import { createFolderSchema, createDocumentSchema } from "../validation/documents.js";
import * as repo from "../repositories/DocumentRepository.js";

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
