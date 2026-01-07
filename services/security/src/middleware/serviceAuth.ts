import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";

export function requireServiceAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.header("x-service-token");
  if (!token || token !== config.SECURITY_SERVICE_TOKEN) {
    return res.status(401).json({ success:false, error:{ code:"UNAUTHORIZED_SERVICE", message:"Missing or invalid service token" }});
  }
  return next();
}
