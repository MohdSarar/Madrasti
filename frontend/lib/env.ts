import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url({ message: "NEXT_PUBLIC_API_URL doit être une URL valide (ex: http://localhost:8080/api)" })
});

type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL
  });

  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join('\n');
    throw new Error(`Configuration environnement invalide:\n${msg}`);
  }

  cached = parsed.data;
  return cached;
}
