import { z } from 'zod';

const url = z.string().url();

const envSchema = z.object({
  // Legacy (kept for backward compatibility): some setups point directly to Kong auth route (ex: http://localhost:8000/auth)
  NEXT_PUBLIC_API_URL: url,

  // Optional explicit service URLs (recommended). If not provided, we derive sensible defaults.
  NEXT_PUBLIC_GATEWAY_URL: url.optional(),

  NEXT_PUBLIC_AUTH_URL: url.optional(),
  NEXT_PUBLIC_ACADEMIC_URL: url.optional(),
  NEXT_PUBLIC_ATTENDANCE_URL: url.optional(),
  NEXT_PUBLIC_SCHEDULING_URL: url.optional(),
  NEXT_PUBLIC_NOTIFICATION_URL: url.optional(),
  NEXT_PUBLIC_DOCUMENT_URL: url.optional(),
  NEXT_PUBLIC_USER_URL: url.optional(),

  NEXT_PUBLIC_SOCKET_URL: url.optional(),
  NEXT_PUBLIC_S3_BUCKET: z.string().optional()
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

function stripTrailing(path: string) {
  return path.replace(/\/+$/, '');
}

function deriveGateway(apiUrl: string): string {
  // If apiUrl ends with a known Kong route prefix, derive gateway base.
  const trimmed = stripTrailing(apiUrl);
  for (const suffix of ['/auth', '/student', '/school', '/user', '/reporting']) {
    if (trimmed.endsWith(suffix)) return trimmed.slice(0, -suffix.length);
  }
  return trimmed;
}

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_GATEWAY_URL: process.env.NEXT_PUBLIC_GATEWAY_URL,

    NEXT_PUBLIC_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL,
    NEXT_PUBLIC_ACADEMIC_URL: process.env.NEXT_PUBLIC_ACADEMIC_URL,
    NEXT_PUBLIC_ATTENDANCE_URL: process.env.NEXT_PUBLIC_ATTENDANCE_URL,
    NEXT_PUBLIC_SCHEDULING_URL: process.env.NEXT_PUBLIC_SCHEDULING_URL,
    NEXT_PUBLIC_NOTIFICATION_URL: process.env.NEXT_PUBLIC_NOTIFICATION_URL,
    NEXT_PUBLIC_DOCUMENT_URL: process.env.NEXT_PUBLIC_DOCUMENT_URL,
    NEXT_PUBLIC_USER_URL: process.env.NEXT_PUBLIC_USER_URL,

    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
    NEXT_PUBLIC_S3_BUCKET: process.env.NEXT_PUBLIC_S3_BUCKET
  });

  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join('\n');
    throw new Error(`Configuration environnement invalide:\n${msg}`);
  }

  // Fill derived defaults without violating schema shape
  const env = parsed.data;
  const gateway = env.NEXT_PUBLIC_GATEWAY_URL ?? deriveGateway(env.NEXT_PUBLIC_API_URL);

  cached = {
    ...env,
    NEXT_PUBLIC_GATEWAY_URL: gateway,
    NEXT_PUBLIC_AUTH_URL: env.NEXT_PUBLIC_AUTH_URL ?? stripTrailing(env.NEXT_PUBLIC_API_URL),
    // Direct-to-service defaults (docker-compose port mappings)
    NEXT_PUBLIC_ACADEMIC_URL: env.NEXT_PUBLIC_ACADEMIC_URL ?? 'http://localhost:8085',
    NEXT_PUBLIC_ATTENDANCE_URL: env.NEXT_PUBLIC_ATTENDANCE_URL ?? 'http://localhost:8086',
    NEXT_PUBLIC_SCHEDULING_URL: env.NEXT_PUBLIC_SCHEDULING_URL ?? 'http://localhost:8087',
    NEXT_PUBLIC_NOTIFICATION_URL: env.NEXT_PUBLIC_NOTIFICATION_URL ?? 'http://localhost:8089',
    NEXT_PUBLIC_DOCUMENT_URL: env.NEXT_PUBLIC_DOCUMENT_URL ?? 'http://localhost:8090',
    NEXT_PUBLIC_USER_URL: env.NEXT_PUBLIC_USER_URL ?? 'http://localhost:8084'
  };

  return cached;
}
