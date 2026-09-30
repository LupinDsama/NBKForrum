import type { Env } from '../types/index.js';
import { json, err } from '../utils/response.js';
import { isEmail, str } from '../utils/validation.js';
import { hashPassword, verifyPassword, newSessionToken, sha256Hex } from '../utils/crypto.js';
import { getSessionUser, sessionCookie, clearSessionCookie, isAdminEmail } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

export async function handleAuth(req: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;

  // POST /api/auth/register {email,password,displayName}
  if (path === '/api/auth/register' && req.method === 'POST') {
    const rl = rateLimit(req, 'register', 10, 600);
    if (rl) return rl;
    let body: any;
    try {
      body = await req.json();
    } catch {
      return err('Dữ liệu không hợp lệ', 400);
    }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const displayName = str(body.displayName ?? body.display_name, 50);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!isEmail(email)) return err('Email không hợp lệ', 400);
    if (!displayName) return err('Tên hiển thị 1-50 ký tự', 400);
    if (password.length < 8 || password.length > 128) return err('Mật khẩu 8-128 ký tự', 400);

    const exists = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first();
    if (exists) return err('Email đã được đăng ký', 409);

    const now = Math.floor(Date.now() / 1000);
    const passwordHash = await hashPassword(password);
    // First admin bootstrap: ADMIN_EMAIL becomes admin immediately.
    const role = isAdminEmail(email, env) ? 'admin' : 'user';
    const r = await env.DB.prepare(
      `INSERT INTO users (email, password_hash, display_name, role, status, email_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', 0, ?, ?)`,
    )
      .bind(email, passwordHash, displayName, role, now, now)
      .run();
    const userId = Number(r.meta.last_row_id);

    // Auto-login after register
    const token = newSessionToken();
    await env.DB.prepare(`INSERT INTO sessions (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)`)
      .bind(userId, await sha256Hex(token), now + 30 * 24 * 3600, now)
      .run();
    return json({ id: userId, email, displayName, role }, 201, { 'Set-Cookie': sessionCookie(token) });
  }

  // POST /api/auth/login {email,password}
  if (path === '/api/auth/login' && req.method === 'POST') {
    const rl = rateLimit(req, 'login', 15, 600);
    if (rl) return rl;
    let body: any;
    try {
      body = await req.json();
    } catch {
      return err('Dữ liệu không hợp lệ', 400);
    }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!isEmail(email) || !password) return err('Email hoặc mật khẩu chưa đúng', 400);
    const user = await env.DB.prepare(`SELECT * FROM users WHERE email = ?`).bind(email).first<any>();
    if (!user) return err('Email hoặc mật khẩu chưa đúng', 401);
    if (user.status !== 'active') return err('Tài khoản không còn hoạt động', 403);
    if (!(await verifyPassword(password, user.password_hash))) return err('Email hoặc mật khẩu chưa đúng', 401);

    const now = Math.floor(Date.now() / 1000);
    const token = newSessionToken();
    await env.DB.prepare(`INSERT INTO sessions (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)`)
      .bind(user.id, await sha256Hex(token), now + 30 * 24 * 3600, now)
      .run();
    return json(
      { id: user.id, email: user.email, displayName: user.display_name, role: user.role },
      200,
      { 'Set-Cookie': sessionCookie(token) },
    );
  }

  // POST /api/auth/logout
  if (path === '/api/auth/logout' && req.method === 'POST') {
    const user = await getSessionUser(req, env);
    if (user) {
      const cookie = req.headers.get('cookie') ?? '';
      const m = cookie.match(/session=([^;]+)/);
      if (m) {
        await env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(await sha256Hex(decodeURIComponent(m[1]))).run();
      }
    }
    return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
  }

  // GET /api/auth/me
  if (path === '/api/auth/me' && req.method === 'GET') {
    const user = await getSessionUser(req, env);
    if (!user) return err('Bạn chưa đăng nhập', 401);
    return json({ id: user.id, email: user.email, displayName: user.display_name, role: user.role });
  }

  return null;
}
