export function replaceVariables(template: string, data: Record<string, any>): string {
  let result = template;
  for (const key of Object.keys(data)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, String(data[key]));
  }
  return result;
}

export function renderTemplate(
  template: { subject_template?: string | null; body_template?: string | null },
  data: Record<string, any>
): { subject: string; body: string } {
  let subject = template.subject_template ?? "";
  let body = template.body_template ?? "";

  subject = replaceVariables(subject, data);
  body = replaceVariables(body, data);

  return { subject, body };
}
