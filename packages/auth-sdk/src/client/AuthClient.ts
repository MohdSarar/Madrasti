import axios, { type AxiosInstance } from "axios";

export type TokenValidationResult =
  | { valid: true; user: { id: string; email: string | null; role: string; school_id: string | null; permissions: string[] } }
  | { valid: false; code: string; message: string };

export class AuthClient {
  private client: AxiosInstance;

  constructor(config: { baseURL: string; timeoutMs?: number; serviceToken: string }) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeoutMs ?? 5000,
      headers: { "X-Service-Token": config.serviceToken },
    });
  }

  async validateAccessToken(token: string): Promise<TokenValidationResult> {
    try {
      const res = await this.client.post("/internal/v1/auth/verify", { token });
      return res.data as TokenValidationResult;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        return { valid: false, code: "TOKEN_INVALID", message: "Invalid token" };
      }
      return { valid: false, code: "AUTH_UNAVAILABLE", message: "Auth validation unavailable" };
    }
  }
}
