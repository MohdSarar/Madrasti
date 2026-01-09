import { Router } from "express";
import * as Attendance from "./controllers/AttendanceController.js";
import * as Leave from "./controllers/LeaveController.js";

export function buildRouter() {
  const r = Router();

  r.post("/api/v1/attendance/mark-class", Attendance.markClass);
  r.get("/api/v1/attendance/by-date/:date", Attendance.byDate);
  r.get("/api/v1/attendance/by-date/:date/class/:classId", Attendance.byDate);
  r.get("/api/v1/attendance/student/:studentId", Attendance.byStudent);
  r.get("/api/v1/attendance/summary/:studentId/:periodId", Attendance.summary);

  r.get("/api/v1/leave-requests", Leave.list);
  r.post("/api/v1/leave-requests", Leave.create);
  r.put("/api/v1/leave-requests/:id/approve", Leave.approve);
  r.put("/api/v1/leave-requests/:id/reject", Leave.reject);
  r.get("/api/v1/leave-requests/pending", (req, res) => {
    req.query.status = "pending";
    return Leave.list(req as any, res as any);
  });

  return r;
}
