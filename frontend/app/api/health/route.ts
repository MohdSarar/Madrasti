export async function GET() {
  return Response.json({ ok: true, service: 'frontend', ts: new Date().toISOString() });
}
