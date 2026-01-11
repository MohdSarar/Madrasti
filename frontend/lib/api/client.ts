// lib/api/client.ts

export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function escapeRegExp(s: string): string {
  return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export function getCookie(name: string): string | null {
  if (!isBrowser()) return null;

  const pattern = `(?:^|; )${escapeRegExp(name)}=([^;]*)`;
  const m = document.cookie.match(new RegExp(pattern));

  const value = m?.[1];
  if (typeof value !== 'string') return null;

  return decodeURIComponent(value);
}

function getAccessToken(): string | null {
  // adapt if your cookie name differs
  return getCookie('access_token');
}

function getRefreshToken(): string | null {
  // adapt if your cookie name differs
  return getCookie('refresh_token');
}

export type ApiClientOptions = {
  baseUrl: string;
};

export class ApiClient {
  private readonly baseUrl: string;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

    const headers = new Headers(init.headers ?? {});
    headers.set('accept', 'application/json');

    const access = getAccessToken();
    if (access) headers.set('authorization', `Bearer ${access}`);

    const res = await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    const headers = new Headers();
    headers.set('content-type', 'application/json');
    return this.request<T>(path, {
      method: 'POST',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
}

// ===== Base URLs =====
// keep these aligned with your current frontend env usage
const AUTH_BASE =
  (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim()) ||
  'http://localhost:8000/auth';

// If you already have other env vars, swap these to those names
const ACADEMIC_BASE = process.env.NEXT_PUBLIC_ACADEMIC_URL?.trim() || 'http://localhost:8085';
const ATTENDANCE_BASE = process.env.NEXT_PUBLIC_ATTENDANCE_URL?.trim() || 'http://localhost:8086';
const SCHEDULING_BASE = process.env.NEXT_PUBLIC_SCHEDULING_URL?.trim() || 'http://localhost:8087';
const NOTIFICATION_BASE = process.env.NEXT_PUBLIC_NOTIFICATION_URL?.trim() || 'http://localhost:8089';
const DOCUMENT_BASE = process.env.NEXT_PUBLIC_DOCUMENT_URL?.trim() || 'http://localhost:8090';

// ===== Named exports expected by hooks/stores =====
export const authClient = new ApiClient({ baseUrl: AUTH_BASE });
export const academicClient = new ApiClient({ baseUrl: ACADEMIC_BASE });
export const attendanceClient = new ApiClient({ baseUrl: ATTENDANCE_BASE });
export const schedulingClient = new ApiClient({ baseUrl: SCHEDULING_BASE });
export const notificationClient = new ApiClient({ baseUrl: NOTIFICATION_BASE });
export const documentClient = new ApiClient({ baseUrl: DOCUMENT_BASE });

// Back-compat (if some files import apiClient)
export const apiClient = authClient;

export const tokens = {
  getAccessToken,
  getRefreshToken,
};
