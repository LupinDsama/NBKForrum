import type { AuthUser, Env } from '../types/index.js';
import { sha256Hex } from '../utils/crypto.js';

const COOKIE = 'session';

export function getCookie(req: Request, name: string): string | null {
  const h = req.headers.get('cookie');
  if (!h) return null;
  for (const part of h.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function sessionCookie(token: string, maxAge = 30 * 24 * 3600): string {
  // Secure in production (https). SameSite=Lax so top-level navigation sends it.
  return `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export async function getSessionUser(req: Request, env: Env): Promise<AuthUser | null> {
  const token = getCookie(req, COOKIE);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.display_name, u.role, u.status
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
  )
    .bind(tokenHash, now)
    .first<AuthUser>();
  if (!row || row.status !== 'active') return null;
  return row;
}

export async function requireAuth(req: Request, env: Env): Promise<{ user: AuthUser } | { response: Response }> {
  const user = await getSessionUser(req, env);
  if (!user) {
    return { response: new Response(JSON.stringify({ error: 'Bạn chưa đăng nhập' }), { status: 401 }) };
  }
  return { user };
}

export function isAdminEmail(email: string, env: Env): boolean {
  return !!env.ADMIN_EMAIL && email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
}
