import { SecurityClient, SecurityEventEmitter } from "@madrasti/security-sdk";

export function getSecurityClient(): SecurityClient | null {
  const baseUrl = process.env['SECURITY_SERVICE_URL'];
  const token = process.env['SECURITY_SERVICE_TOKEN'];
  if (!baseUrl || !token) return null;
  return new SecurityClient({ baseUrl, serviceToken: token });
}

export function getSecurityEmitter(): SecurityEventEmitter | null {
  const client = getSecurityClient();
  if (!client) return null;
  return new SecurityEventEmitter(client);
}
