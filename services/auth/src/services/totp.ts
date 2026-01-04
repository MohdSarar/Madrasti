import speakeasy from "speakeasy";
import qrcode from "qrcode";

export function generateTotpSecret(issuer: string, accountName: string) {
  const secret = speakeasy.generateSecret({
    name: `${issuer}:${accountName}`,
    issuer,
    length: 20,
  });
  return secret; // contains base32 + otpauth_url
}

export async function otpauthToQrDataUrl(otpauthUrl: string): Promise<string> {
  return qrcode.toDataURL(otpauthUrl);
}

export function verifyTotp(token: string, secretBase32: string): boolean {
  return speakeasy.totp.verify({
    secret: secretBase32,
    encoding: "base32",
    token,
    window: 1,
  });
}
