import { pool } from "../db.js";

export type ProfileRow = {
  id: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  date_of_birth: string | null;
  gender: string | null;
  photo_url: string | null;
  address: any | null;
  bio: string | null;
  created_at: string;
};

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const res = await pool.query<ProfileRow>(`SELECT * FROM user_profiles WHERE id=$1 LIMIT 1`, [userId]);
  return res.rows[0] ?? null;
}

export async function upsertProfile(userId: string, changes: Partial<ProfileRow>): Promise<ProfileRow> {
  const res = await pool.query<ProfileRow>(
    `INSERT INTO user_profiles (id, first_name_ar, last_name_ar, date_of_birth, gender, photo_url, address, bio)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO UPDATE SET
       first_name_ar=COALESCE(EXCLUDED.first_name_ar, user_profiles.first_name_ar),
       last_name_ar=COALESCE(EXCLUDED.last_name_ar, user_profiles.last_name_ar),
       date_of_birth=COALESCE(EXCLUDED.date_of_birth, user_profiles.date_of_birth),
       gender=COALESCE(EXCLUDED.gender, user_profiles.gender),
       photo_url=COALESCE(EXCLUDED.photo_url, user_profiles.photo_url),
       address=COALESCE(EXCLUDED.address, user_profiles.address),
       bio=COALESCE(EXCLUDED.bio, user_profiles.bio)
     RETURNING *`,
    [
      userId,
      changes.first_name_ar ?? null,
      changes.last_name_ar ?? null,
      changes.date_of_birth ?? null,
      changes.gender ?? null,
      changes.photo_url ?? null,
      changes.address ?? null,
      changes.bio ?? null,
    ]
  );

  const row = res.rows[0];
  if (!row) throw new Error("upsertProfile: upsert returned no row");
  return row;
}
