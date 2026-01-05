import speakeasy from "speakeasy";

export function generateTotpSecret(label: string) {
  return speakeasy.generateSecret({ name: label, length: 20 });
}

export function verifyTotp(token: string, base32Secret: string) {
  return speakeasy.totp.verify({
    secret: base32Secret,
    encoding: "base32",
    token,
    window: 1,
  });
}
