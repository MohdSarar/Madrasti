import { Router } from "express";
import * as D from "./controllers/DocumentController.js";
import upload from "./middleware/upload.js";
import { requireDocumentAccess } from "./middleware/requireDocumentAccess.js";

export function buildRouter() {
  const r = Router();

  // Folders
  r.get("/api/v1/folders", D.listFolders);
  r.post("/api/v1/folders", D.createFolder);

  // Documents metadata
  r.get("/api/v1/documents", D.listDocuments);
  r.post("/api/v1/documents", D.createDocument);

  // Single document
  r.get("/api/v1/documents/:id", requireDocumentAccess("view"), D.getDocument);
  r.patch("/api/v1/documents/:id/move", requireDocumentAccess("edit"), D.move);

  // Binary upload to S3 and download via pre-signed URLs
  r.post("/api/v1/documents/upload", upload.single("file"), D.uploadDocument);
  r.get("/api/v1/documents/:id/download", requireDocumentAccess("download"), D.downloadDocument);

  // Permission management
  r.get("/api/v1/documents/:id/permissions", requireDocumentAccess("edit"), D.listPermissions);
  r.post("/api/v1/documents/:id/permissions", requireDocumentAccess("edit"), D.grantPermission);
  r.delete("/api/v1/documents/:id/permissions/:permissionId", requireDocumentAccess("edit"), D.revokePermission);

  return r;
}
