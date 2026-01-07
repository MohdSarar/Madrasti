import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";
import { HttpError } from "../utils/http.js";

export function requireServiceToken(req: Request, _res: Response, next: NextFunction) {
  const token = req.header("X-Service-Token") ?? "";
  if (!token || token !== config.internalServiceToken) {
    return next(new HttpError(401, "SERVICE_AUTH_FAILED", "Invalid service token"));
  }
  return next();
}
