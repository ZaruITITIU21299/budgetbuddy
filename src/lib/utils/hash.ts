/**
 * Demo-only password hashing. Uses Web Crypto SHA-256 with a per-app pepper.
 * NOT production-safe — see DatabaseChange.md §4.
 */
const PEPPER = 'bb-demo-pepper-1';

export async function hashPassword(plain: string): Promise<string> {
  const data = new TextEncoder().encode(plain + PEPPER);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  const candidate = await hashPassword(plain);
  return candidate === hashed;
}
