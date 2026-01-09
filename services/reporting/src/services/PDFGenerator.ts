import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import type { ReportData, SchoolInfo, StudentInfo, AcademicPeriod, GradeDetail, AttendanceSummary, GPAResult } from "./ReportCardGenerator.js";
import { config } from "../config.js";

function tryRegisterFont(doc: PDFKit.PDFDocument, name: string, filepath: string) {
  try {
    if (fs.existsSync(filepath)) doc.registerFont(name, filepath);
  } catch {
    // ignore
  }
}

export class PDFGenerator {
  static async generatePDF(reportData: ReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Fonts (optional)
      tryRegisterFont(doc as any, "Amiri", config.pdfFonts.amiriRegular);
      tryRegisterFont(doc as any, "Amiri-Bold", config.pdfFonts.amiriBold);

      this.addHeader(doc as any, reportData.school);
      this.addStudentInfo(doc as any, reportData.student, reportData.period);
      this.addGradesTable(doc as any, reportData.grades);
      this.addAttendanceSummary(doc as any, reportData.attendance);
      this.addGPASection(doc as any, reportData.gpa, reportData.classRank);

      if (reportData.teacherComments) {
        this.addComments(doc as any, reportData.teacherComments);
      }

      this.addSignature(doc as any);
      this.addFooter(doc as any);
      doc.end();
    });
  }

  private static addHeader(doc: PDFKit.PDFDocument, school: SchoolInfo) {
    // Title
    doc.font("Helvetica-Bold").fontSize(16).text("Academic Report Card", { align: "center" });
    doc.moveDown(0.5);

    // School info
    doc.font("Helvetica").fontSize(10).text(`School ID: ${school.id}`, { align: "center" });
    if (school.name_en) doc.text(school.name_en, { align: "center" });
    doc.moveDown(0.75);
    this.line(doc);
  }

  private static addStudentInfo(doc: PDFKit.PDFDocument, student: StudentInfo, period: AcademicPeriod) {
    doc.font("Helvetica-Bold").fontSize(12).text("Student", { underline: true });
    doc.font("Helvetica").fontSize(10);
    doc.text(`Student ID: ${student.id}`);
    if (student.full_name_en) doc.text(`Name: ${student.full_name_en}`);
    if (student.class_name_en) doc.text(`Class: ${student.class_name_en}`);
    if (period.name_en) doc.text(`Period: ${period.name_en}`);
    doc.moveDown(0.75);
    this.line(doc);
  }

  private static addGradesTable(doc: PDFKit.PDFDocument, grades: GradeDetail[]) {
    doc.font("Helvetica-Bold").fontSize(12).text("Grades", { underline: true });
    doc.moveDown(0.25);

    const col = { subject: 50, assess: 220, marks: 330, grade: 410, points: 470 };
    const y0 = doc.y;

    doc.font("Helvetica-Bold").fontSize(9);
    doc.text("Subject", col.subject, y0);
    doc.text("Assessment", col.assess, y0);
    doc.text("Marks", col.marks, y0);
    doc.text("Grade", col.grade, y0);
    doc.text("Points", col.points, y0);

    doc.moveDown(0.3);
    this.line(doc);
    doc.font("Helvetica").fontSize(9);

    if (!grades.length) {
      doc.text("No grades available.", col.subject, doc.y + 4);
      doc.moveDown(1);
      this.line(doc);
      return;
    }

    for (const g of grades) {
      const y = doc.y + 4;
      doc.text(g.subject, col.subject, y, { width: 160 });
      doc.text(g.assessment_type ?? "", col.assess, y, { width: 100 });
      doc.text(g.marks, col.marks, y);
      doc.text(g.letter, col.grade, y);
      doc.text((Number(g.points) || 0).toFixed(1), col.points, y);
      doc.moveDown(0.6);
    }

    this.line(doc);
  }

  private static addAttendanceSummary(doc: PDFKit.PDFDocument, a: AttendanceSummary) {
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(12).text("Attendance", { underline: true });
    doc.font("Helvetica").fontSize(10);
    doc.text(`Total days: ${a.total_days}`);
    doc.text(`Present: ${a.present_days}`);
    doc.text(`Absent: ${a.absent_days}`);
    doc.text(`Tardy: ${a.tardy_days}`);
    doc.text(`Excused: ${a.excused_days}`);
    doc.text(`Attendance rate: ${(Number(a.attendance_rate) || 0).toFixed(1)}%`);
    doc.moveDown(0.5);
    this.line(doc);
  }

  private static addGPASection(doc: PDFKit.PDFDocument, gpa: GPAResult, rank: number) {
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(12).text("Performance", { underline: true });
    doc.font("Helvetica").fontSize(10);
    doc.text(`GPA (4.0): ${(Number(gpa.gpa) || 0).toFixed(2)}`);
    doc.text(`Cumulative GPA: ${(Number(gpa.cgpa) || 0).toFixed(2)}`);
    doc.text(`Class rank: ${rank || 0}`);
    doc.moveDown(0.5);
    this.line(doc);
  }

  private static addComments(doc: PDFKit.PDFDocument, comments: string) {
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(12).text("Teacher Comments", { underline: true });
    doc.font("Helvetica").fontSize(10).text(comments, { width: 495, align: "left" });
    doc.moveDown(0.5);
    this.line(doc);
  }

  private static addSignature(doc: PDFKit.PDFDocument) {
    doc.moveDown(1.2);
    const y = doc.y;
    doc.font("Helvetica").fontSize(10);
    doc.text("_____________________", 50, y);
    doc.text("Principal Signature", 50, y + 15);
    doc.text("_____________________", 330, y);
    doc.text("School Stamp", 330, y + 15);
  }

  private static addFooter(doc: PDFKit.PDFDocument) {
    const bottom = doc.page.height - 45;
    doc.font("Helvetica").fontSize(8).text("Generated by Madrasti Platform", 50, bottom, { align: "center" });
  }

  private static line(doc: PDFKit.PDFDocument) {
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);
  }
}
