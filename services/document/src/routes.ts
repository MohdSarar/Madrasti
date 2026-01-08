import { Router } from "express";
import * as D from "./controllers/DocumentController.js";

export function buildRouter() {
  const r = Router();
  r.get("/api/v1/folders", D.listFolders);
  r.post("/api/v1/folders", D.createFolder);

  r.get("/api/v1/documents", D.listDocuments);
  r.post("/api/v1/documents", D.createDocument);

  return r;
}
