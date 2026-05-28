import test from "node:test";
import assert from "node:assert/strict";
import { renderTemplate } from "../dist/services/templateRenderer.js";

test("renderTemplate: substitutes variables in subject and body", () => {
  const result = renderTemplate(
    { subject_template: "Hello {{name}}", body_template: "Welcome {{name}}, your class is {{class}}" },
    { name: "Ahmed", class: "10-A" }
  );
  assert.equal(result.subject, "Hello Ahmed");
  assert.equal(result.body, "Welcome Ahmed, your class is 10-A");
});

test("renderTemplate: handles null templates gracefully", () => {
  const result = renderTemplate({ subject_template: null, body_template: null }, { name: "Ahmed" });
  assert.equal(result.subject, "");
  assert.equal(result.body, "");
});
