import { describe, it, expect } from "@jest/globals";
import { PDFGenerator } from "../../src/services/PDFGenerator.js";
describe("PDFGenerator", () => {
    it("should generate a PDF buffer", async () => {
        const buf = await PDFGenerator.generatePDF({
            student: { id: "s1", full_name_en: "Student One", class_name_en: "1A" },
            school: { id: "sch1", name_en: "School One", logo_url: null },
            period: { id: "p1", name_en: "Term 1" },
            grades: [],
            attendance: { total_days: 0, present_days: 0, absent_days: 0, tardy_days: 0, excused_days: 0, attendance_rate: 0 },
            gpa: { gpa: 0, cgpa: 0, rank: 0 },
            classRank: 0,
        });
        expect(Buffer.isBuffer(buf)).toBe(true);
        expect(buf.length).toBeGreaterThan(100);
    });
});
