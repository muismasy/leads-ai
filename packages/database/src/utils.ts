import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Hash password using SHA-256 with salt.
 * For production, replace with bcrypt/argon2 via native module.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(salt + password).digest('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored hash.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const candidate = createHash('sha256').update(salt + password).digest('hex');
  return timingSafeEqual(Buffer.from(hash), Buffer.from(candidate));
}

/**
 * Generate a URL-safe slug from text.
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}
