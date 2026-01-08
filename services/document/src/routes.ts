import { Router } from "express";
import * as D from "./controllers/DocumentController.js";
import upload from "./middleware/upload.js";

export function buildRouter() {
  const r = Router();
  r.get("/api/v1/folders", D.listFolders);
  r.post("/api/v1/folders", D.createFolder);

  r.get("/api/v1/documents", D.listDocuments);
  r.post("/api/v1/documents", D.createDocument);

  // STEP 4: binary upload to S3 and download via pre-signed URLs
  r.post("/api/v1/documents/upload", upload.single("file"), D.uploadDocument);
  r.get("/api/v1/documents/:id/download", D.downloadDocument);

  return r;
}
