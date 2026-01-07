import type { SecurityEvent } from "./types.js";

export type SecurityClientConfig = {
  baseUrl: string;
  serviceToken: string;
  timeoutMs?: number;
};

async function fetchJson<T>(url: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    const data = text ? (JSON.parse(text) as any) : {};
    if (!res.ok) {
      const err: any = new Error(data?.error?.message ?? `HTTP ${res.status}`);
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data as T;
  } finally {
    clearTimeout(t);
  }
}

export class SecurityClient {
  private readonly timeoutMs: number;
  constructor(private readonly cfg: SecurityClientConfig) {
    this.timeoutMs = cfg.timeoutMs ?? 2000;
  }

  private headers(extra?: HeadersInit): HeadersInit {
    return { "content-type":"application/json", "x-service-token": this.cfg.serviceToken, ...extra };
  }

  async logEvent(event: SecurityEvent) {
    return fetchJson(`${this.cfg.baseUrl}/api/v1/audit/events`, { method:"POST", headers:this.headers(), body: JSON.stringify(event) }, this.timeoutMs);
  }

  async validatePassword(params: { password: string; schoolId: string; userId?: string }) {
    return fetchJson(`${this.cfg.baseUrl}/api/v1/password/validate`, { method:"POST", headers:this.headers(), body: JSON.stringify(params) }, this.timeoutMs);
  }

  async recordFailedAttempt(params: { userId: string; schoolId: string; reason: string }) {
    return fetchJson(`${this.cfg.baseUrl}/api/v1/lockout/events`, { method:"POST", headers:this.headers(), body: JSON.stringify(params) }, this.timeoutMs);
  }

  async getLockoutStatus(params: { userId: string; schoolId: string }) {
    const qs = new URLSearchParams({ school_id: params.schoolId }).toString();
    return fetchJson(`${this.cfg.baseUrl}/api/v1/lockout/status/${params.userId}?${qs}`, { method:"GET", headers:this.headers() }, this.timeoutMs);
  }

  async unlockAccount(params: { userId: string }) {
    return fetchJson(`${this.cfg.baseUrl}/api/v1/lockout/unlock/${params.userId}`, { method:"POST", headers:this.headers() }, this.timeoutMs);
  }

  async gdprForget(params: { userId: string; schoolId?: string }) {
    return fetchJson(`${this.cfg.baseUrl}/api/v1/compliance/gdpr/forget`, { method:"POST", headers:this.headers(), body: JSON.stringify(params) }, this.timeoutMs);
  }
}
