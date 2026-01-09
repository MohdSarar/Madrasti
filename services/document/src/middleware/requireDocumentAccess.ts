import type { Request, Response, NextFunction, RequestHandler } from "express";
import { PermissionService } from "../services/PermissionService.js";

export type DocumentAccessLevel = "view" | "download" | "edit" | "delete";

export function requireDocumentAccess(level: DocumentAccessLevel): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const documentId = req.params.id;
    const userId = (req as any).user?.id ?? (req.headers["x-user-id"] as string | undefined);

    if (!userId) {
      return res.status(401).json({ code: "UNAUTHORIZED", message: "Authentication required" });
    }
    if (!documentId) {
      return res.status(400).json({ code: "VALIDATION_ERROR", message: "Document ID required" });
    }

    // IMPORTANT: compatible avec l’ancienne signature checkAccess(userId, documentId)
    // Si ton PermissionService supporte un 3e param, il l’ignorera pas.
    const hasAccess = await (PermissionService as any).checkAccess(userId, documentId, level);

    if (!hasAccess) {
      return res.status(403).json({ code: "FORBIDDEN", message: "Access denied to this document" });
    }

    next();
  };
}
