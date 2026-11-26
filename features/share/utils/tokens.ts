import crypto from "node:crypto";

/** Generates a 32-byte URL-safe cryptographic share token. */
export function generateShareToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** Hashes a share token with SHA-256 for database storage/lookup. */
export function hashShareToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Hashes a share password using scrypt with a random 16-byte salt. */
export function hashSharePassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

/** Verifies a share password against a stored `salt:hash` string. */
export function verifySharePassword(password: string, storedHash: string): boolean {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}
