import axios from "axios";
import { config } from "../config.js";
import * as ReportRepository from "../repositories/ReportRepository.js";
import { logger } from "../logger.js";

export type StudentInfo = {
  id: string;
  full_name_ar?: string;
  full_name_en?: string;
  class_name_ar?: string;
  class_name_en?: string;
};

export type SchoolInfo = {
  id: string;
  name_ar?: string;
  name_en?: string;
  logo_url?: string | null;
};

export type AcademicPeriod = {
  id: string;
  name_ar?: string;
  name_en?: string;
};

export type GradeDetail = {
  subject: string;
  assessment_type?: string;
  marks: string;
  percentage: number;
  letter: string;
  points: number;
};

export type AttendanceSummary = {
  total_days: number;
  present_days: number;
  absent_days: number;
  tardy_days: number;
  excused_days: number;
  attendance_rate: number;
};

export type GPAResult = {
  gpa: number;
  cgpa: number;
  rank: number;
};

export type ReportData = {
  student: StudentInfo;
  school: SchoolInfo;
  period: AcademicPeriod;
  grades: GradeDetail[];
  attendance: AttendanceSummary;
  gpa: GPAResult;
  classRank: number;
  teacherComments?: string;
};

const http = axios.create({
  timeout: config.httpTimeoutMs,
});

async function safeGet<T>(url: string, params?: any): Promise<T> {
  const r = await http.get(url, { params });
  return r.data as T;
}

export class ReportCardGenerator {
  /**
   * Aggregate all data needed for a report card.
   * This is designed to be robust even if some upstream data is missing:
   * - if services are unavailable, it returns empty sections (and logs errors).
   */
  static async generate(reportId: string): Promise<ReportData> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("REPORT_NOT_FOUND");

    const school_id = String(report.school_id);
    const student_id = String(report.student_id);
    const period_id = String(report.academic_period_id);

    const baseData = (report.data && typeof report.data === "object") ? report.data : {};

    const student: StudentInfo = {
      id: student_id,
      full_name_ar: baseData?.student?.full_name_ar ?? baseData?.student_full_name_ar ?? "",
      full_name_en: baseData?.student?.full_name_en ?? baseData?.student_full_name_en ?? "",
      class_name_ar: baseData?.student?.class_name_ar ?? "",
      class_name_en: baseData?.student?.class_name_en ?? "",
    };

    const school: SchoolInfo = {
      id: school_id,
      name_ar: baseData?.school?.name_ar ?? baseData?.school_name_ar ?? "",
      name_en: baseData?.school?.name_en ?? baseData?.school_name_en ?? "",
      logo_url: baseData?.school?.logo_url ?? baseData?.school_logo_url ?? null,
    };

    const period: AcademicPeriod = {
      id: period_id,
      name_ar: baseData?.period?.name_ar ?? baseData?.period_name_ar ?? "",
      name_en: baseData?.period?.name_en ?? baseData?.period_name_en ?? "",
    };

    const grades = await this.fetchGrades(student_id, period_id).catch((error) => {
      logger.warn({ error: String(error) }, "report_fetch_grades_failed");
      return [];
    });

    const attendance = await this.fetchAttendance(student_id, period_id).catch((error) => {
      logger.warn({ error: String(error) }, "report_fetch_attendance_failed");
      return {
        total_days: 0, present_days: 0, absent_days: 0, tardy_days: 0, excused_days: 0, attendance_rate: 0,
      };
    });

    const gpa = await this.fetchGPA(student_id, period_id).catch((error) => {
      logger.warn({ error: String(error) }, "report_fetch_gpa_failed");
      return { gpa: 0, cgpa: 0, rank: 0 };
    });

    return {
      student,
      school,
      period,
      grades,
      attendance,
      gpa,
      classRank: gpa.rank ?? 0,
      teacherComments: baseData?.teacherComments ?? baseData?.teacher_comments ?? undefined,
    };
  }

  private static async fetchGrades(studentId: string, periodId: string): Promise<GradeDetail[]> {
    // Expect Academic service to support this endpoint. If it doesn't, return [].
    const url = `${config.services.academic}/api/v1/grades/by-student/${studentId}`;
    const data: any[] = await safeGet<any[]>(url, { period_id: periodId });

    return data.map((g: any) => ({
      subject: String(g.subject_name ?? g.subject ?? "N/A"),
      assessment_type: String(g.assessment_type ?? g.type ?? ""),
      marks: `${g.marks_obtained ?? g.marks ?? 0}/${g.marks_total ?? g.total ?? 0}`,
      percentage: Number(g.percentage ?? 0),
      letter: String(g.grade_letter ?? g.letter ?? ""),
      points: Number(g.grade_points ?? g.points ?? 0),
    }));
  }

  private static async fetchAttendance(studentId: string, periodId: string): Promise<AttendanceSummary> {
    const url = `${config.services.attendance}/api/v1/attendance/summary/${studentId}/${periodId}`;
    const data: any = await safeGet<any>(url);
    return {
      total_days: Number(data.total_days ?? 0),
      present_days: Number(data.present_days ?? 0),
      absent_days: Number(data.absent_days ?? 0),
      tardy_days: Number(data.tardy_days ?? 0),
      excused_days: Number(data.excused_days ?? 0),
      attendance_rate: Number(data.attendance_rate ?? 0),
    };
  }

  private static async fetchGPA(studentId: string, periodId: string): Promise<GPAResult> {
    const url = `${config.services.academic}/api/v1/grades/student/${studentId}/period/${periodId}/gpa`;
    const data: any = await safeGet<any>(url);
    return {
      gpa: Number(data.gpa ?? 0),
      cgpa: Number(data.cgpa ?? data.cumulative_gpa ?? 0),
      rank: Number(data.rank ?? 0),
    };
  }
}
