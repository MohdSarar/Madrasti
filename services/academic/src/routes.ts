import { Router } from "express";
import * as Subject from "./controllers/SubjectController.js";
import * as Grade from "./controllers/GradeController.js";

export function buildRouter() {
  const r = Router();

  // Subjects
  r.get("/api/v1/subjects", Subject.list);
  r.post("/api/v1/subjects", Subject.create);
  r.get("/api/v1/subjects/:id", Subject.get);
  r.put("/api/v1/subjects/:id", Subject.update);
  r.delete("/api/v1/subjects/:id", Subject.remove);
  r.get("/api/v1/subjects/by-grade/:gradeId", (req, res) => {
    // alias: expects query school_id + param gradeId
    req.query.grade_level_id = req.params.gradeId;
    return Subject.list(req as any, res as any);
  });

  // Grades
  r.get("/api/v1/grades/by-student/:studentId", Grade.byStudent);
  r.post("/api/v1/grades", Grade.create);
  r.post("/api/v1/grades/bulk", Grade.bulk);
  r.get("/api/v1/grades/student/:studentId/gpa", Grade.gpa);
  r.get(
    "/api/v1/grades/student/:studentId/period/:periodId/gpa",
    Grade.getStudentGPA
  );

  return r;
}
