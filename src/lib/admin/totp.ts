import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function decodeBase32(input: string): Buffer | null {
  const clean = input.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  if (!clean || !/^[A-Z2-7]+$/.test(clean)) return null;
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }
  return bytes.length ? Buffer.from(bytes) : null;
}

export function generateBase32Secret(): string {
  const bytes = randomBytes(20);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHABET[(value >>> bits) & 31];
    }
  }
  return out;
}

export function otpauthUri(id: string, secret: string): string {
  return `otpauth://totp/${encodeURIComponent(`레이븐:${id}`)}?secret=${secret}&issuer=${encodeURIComponent("레이븐")}&algorithm=SHA1&digits=6&period=30`;
}

const ID_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}._-]{1,31}$/u;

export function normalizeAdminId(input: string): string | null {
  const id = input.trim();
  if (!ID_PATTERN.test(id)) return null;
  return id;
}

export function hotp(secret: Buffer, counter: number, digits = 6): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}

export function totpCode(secretBase32: string, now = Date.now()): string | null {
  const secret = decodeBase32(secretBase32);
  if (!secret) return null;
  return hotp(secret, Math.floor(now / 1000 / 30));
}

export function verifyTotp(secretBase32: string, code: string, now = Date.now(), window = 1): boolean {
  const secret = decodeBase32(secretBase32);
  const token = code.replace(/\s+/g, "");
  if (!secret || !/^\d{6}$/.test(token)) return false;
  const counter = Math.floor(now / 1000 / 30);
  for (let skew = -window; skew <= window; skew += 1) {
    if (safeEqual(hotp(secret, counter + skew), token)) return true;
  }
  return false;
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export type LoginVerdict = "ok" | "unconfigured" | "bad";

export function credentialsMatch(id: string, code: string, now = Date.now()): LoginVerdict {
  const expectedId = process.env.ADMIN_ID?.trim() ?? "";
  const secret = process.env.ADMIN_TOTP_SECRET?.trim() ?? "";
  if (!expectedId || !secret || !decodeBase32(secret)) return "unconfigured";
  const idOk = safeEqual(id.trim(), expectedId);
  const codeOk = verifyTotp(secret, code, now);
  return idOk && codeOk ? "ok" : "bad";
}
