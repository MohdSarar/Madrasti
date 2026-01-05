import request from 'supertest';
import { Client } from 'pg';

// NOTE: setup.ts runs migrations and sets env

async function insertUser(params: {
  email: string;
  password: string;
  role: 'super_admin' | 'school_admin' | 'staff' | 'teacher' | 'parent' | 'student';
  school_id?: string | null;
}) {
  const { hashPassword } = await import('../src/services/password.js');
  const password_hash = await hashPassword(params.password);
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const userIdRes = await db.query(
    `INSERT INTO users (email, password_hash, role, school_id, is_active)
     VALUES ($1,$2,$3,$4,true)
     RETURNING id`,
    [params.email, password_hash, params.role, params.school_id ?? null],
  );
  await db.end();
  return userIdRes.rows[0].id as string;
}

describe('Auth service - critical flows', () => {
  test('GET /health returns ok', async () => {
    const { buildApp } = await import('../src/app.js');
    const app = buildApp();

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test('login -> refresh -> logout works', async () => {
    await insertUser({
      email: 'superadmin@madrasti.local',
      password: 'SuperAdmin12345!',
      role: 'super_admin',
      school_id: null,
    });
    

    const { buildApp } = await import('../src/app.js');
    const app = buildApp();

    const login = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'superadmin@madrasti.local', password: 'SuperAdmin12345!' })
      .expect(200);
    

    expect(typeof login.body.access_token).toBe('string');
    expect(typeof login.body.refresh_token).toBe('string');

    const refresh = await request(app)
      .post('/v1/auth/refresh')
      .send({ refresh_token: login.body.refresh_token })
      .expect(200);

    expect(typeof refresh.body.access_token).toBe('string');

    await request(app)
      .post('/v1/auth/logout')
      .send({ refresh_token: login.body.refresh_token })
      .expect(200);
  });
});
