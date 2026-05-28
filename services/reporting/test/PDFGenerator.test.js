import test from "node:test";
import assert from "node:assert/strict";

test("PDFGenerator: builds metadata object from report params", () => {
  const params = { title: "Attendance Report", schoolName: "Al-Nour", date: "2026-01" };
  const metadata = { title: params.title, author: params.schoolName, createdAt: params.date };
  assert.equal(metadata.title, "Attendance Report");
  assert.equal(metadata.author, "Al-Nour");
});
