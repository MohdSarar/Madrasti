import { describe, it, expect } from "@jest/globals";
import { renderTemplate } from "../../src/services/templateRenderer.js";

describe("TemplateRenderer", () => {
  it("should replace {{variable}} placeholders correctly", () => {
    const out = renderTemplate({ subject_template: "Hi {{name}}", body_template: "Hello {{name}}" }, { name: "Mohammed" });
    expect(out.subject).toBe("Hi Mohammed");
    expect(out.body).toBe("Hello Mohammed");
  });

  it("should handle missing variables gracefully", () => {
    const out = renderTemplate({ subject_template: "Hi {{name}}", body_template: "Hello {{name}}" }, {});
    expect(out.subject).toBe("Hi {{name}}");
  });

  it("should support Arabic and English templates", () => {
    const out = renderTemplate({ subject_template: "مرحبا {{name}}", body_template: "Hello {{name}}" }, { name: "محمد" });
    expect(out.subject).toBe("مرحبا محمد");
  });
});
