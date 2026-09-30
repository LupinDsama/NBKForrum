import type { Env } from '../types/index.js';
import { json, err } from '../utils/response.js';
import { str } from '../utils/validation.js';
import { getSessionUser } from '../middleware/auth.js';
import { requireAdmin, logAdmin } from '../middleware/admin.js';

// All /api/admin/* require role=admin (PHAN 23). Frontend check is UI-only.
export async function handleAdmin(req: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (!path.startsWith('/api/admin/')) return null;
  const user = await getSessionUser(req, env);
  const denied = requireAdmin(user);
  if (denied) return denied;
  const admin = user!;

  // GET /api/admin/dashboard -> counts
  if (path === '/api/admin/dashboard' && req.method === 'GET') {
    const [u, p, q, c, r] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) AS n FROM users`).first<any>(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM posts WHERE status = 'published'`).first<any>(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM questions WHERE status = 'published'`).first<any>(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM confessions WHERE status = 'pending'`).first<any>(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM reports WHERE status = 'open'`).first<any>(),
    ]);
    return json({ users: u?.n ?? 0, posts: p?.n ?? 0, questions: q?.n ?? 0, pendingConfessions: c?.n ?? 0, openReports: r?.n ?? 0 });
  }

  // GET /api/admin/confessions?status=pending
  if (path === '/api/admin/confessions' && req.method === 'GET') {
    const status = url.searchParams.get('status') ?? 'pending';
    if (!['pending', 'approved', 'rejected'].includes(status)) return err('Trạng thái không hợp lệ', 400);
    const rows = await env.DB.prepare(
      `SELECT cf.*, u.email AS author_email, u.display_name AS author_name
       FROM confessions cf LEFT JOIN users u ON u.id = cf.author_id
       WHERE cf.status = ? ORDER BY cf.created_at ASC LIMIT 100`,
    )
      .bind(status)
      .all();
    return json({ items: rows.results });
  }

  // POST /api/admin/confessions/:id/approve
  const approve = path.match(/^\/api\/admin\/confessions\/(\d+)\/approve$/);
  if (approve && req.method === 'POST') {
    const id = Number(approve[1]);
    const now = Math.floor(Date.now() / 1000);
    const r = await env.DB.prepare(
      `UPDATE confessions SET status = 'approved', reviewed_by = ?, reviewed_at = ?, published_at = ?
       WHERE id = ? AND status = 'pending'`,
    )
      .bind(admin.id, now, now, id)
      .run();
    if (r.meta.changes === 0) return err('Bài không tồn tại hoặc đã được xử lý', 404);
    await logAdmin(env.DB, admin.id, 'approve_confession', 'confession', id);
    const cfA = await env.DB.prepare(`SELECT author_id FROM confessions WHERE id = ?`).bind(id).first<any>();
    if (cfA?.author_id) {
      await env.DB.prepare(
        `INSERT INTO notifications (user_id, type, title, message, target_type, target_id, is_read, created_at)
         VALUES (?, 'confession_approved', 'Confession da duoc duyet', 'Bai confession cua ban da duoc phe duyet va hien cong khai.', 'confession', ?, 0, ?)`,
      )
        .bind(cfA.author_id, id, now)
        .run();
    }
    return json({ ok: true });
  }

  // POST /api/admin/confessions/:id/reject {reason}
  const reject = path.match(/^\/api\/admin\/confessions\/(\d+)\/reject$/);
  if (reject && req.method === 'POST') {
    const id = Number(reject[1]);
    const body: any = await req.json().catch(() => ({}));
    const reason = str(body?.reason ?? body?.rejection_reason, 1000) ?? 'Không phù hợp';
    const now = Math.floor(Date.now() / 1000);
    const r = await env.DB.prepare(
      `UPDATE confessions SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, rejection_reason = ?
       WHERE id = ? AND status = 'pending'`,
    )
      .bind(admin.id, now, reason, id)
      .run();
    if (r.meta.changes === 0) return err('Bài không tồn tại hoặc đã được xử lý', 404);
    await logAdmin(env.DB, admin.id, 'reject_confession', 'confession', id, { reason });
    const cfR = await env.DB.prepare(`SELECT author_id FROM confessions WHERE id = ?`).bind(id).first<any>();
    if (cfR?.author_id) {
      await env.DB.prepare(
        `INSERT INTO notifications (user_id, type, title, message, target_type, target_id, is_read, created_at)
         VALUES (?, 'confession_rejected', 'Confession bi tu choi', ?, 'confession', ?, 0, ?)`,
      )
        .bind(cfR.author_id, `Bai confession cua ban bi tu choi. Ly do: ${reason}`, id, now)
        .run();
    }
    return json({ ok: true });
  }

  // GET /api/admin/users?search=&status=
  if (path === '/api/admin/users' && req.method === 'GET') {
    const search = url.searchParams.get('search');
    const rows = search
      ? await env.DB.prepare(
          `SELECT id, email, display_name, role, status, created_at FROM users
           WHERE email LIKE ? OR display_name LIKE ? ORDER BY created_at DESC LIMIT 100`,
        )
          .bind(`%${search}%`, `%${search}%`)
          .all()
      : await env.DB.prepare(
          `SELECT id, email, display_name, role, status, created_at FROM users ORDER BY created_at DESC LIMIT 100`,
        ).all();
    return json({ items: rows.results });
  }

  // POST /api/admin/users/:id/ban | unban | set-role {role}
  const ban = path.match(/^\/api\/admin\/users\/(\d+)\/(ban|unban)$/);
  if (ban && req.method === 'POST') {
    const id = Number(ban[1]);
    const status = ban[2] === 'ban' ? 'banned' : 'active';
    await env.DB.prepare(`UPDATE users SET status = ? WHERE id = ?`).bind(status, id).run();
    await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(id).run();
    await logAdmin(env.DB, admin.id, ban[2] + '_user', 'user', id);
    return json({ ok: true });
  }
  const roleM = path.match(/^\/api\/admin\/users\/(\d+)\/role$/);
  if (roleM && req.method === 'POST') {
    const body: any = await req.json().catch(() => ({}));
    if (!['user', 'admin'].includes(body?.role)) return err('Vai trò phải là user hoặc admin', 400);
    await env.DB.prepare(`UPDATE users SET role = ? WHERE id = ?`).bind(body.role, Number(roleM[1])).run();
    await logAdmin(env.DB, admin.id, 'set_role', 'user', Number(roleM[1]), { role: body.role });
    return json({ ok: true });
  }

  // GET /api/admin/reports?status=open + POST /api/admin/reports/:id/resolve {resolution: resolved|dismissed}
  if (path === '/api/admin/reports' && req.method === 'GET') {
    const status = url.searchParams.get('status') ?? 'open';
    const rows = await env.DB.prepare(`SELECT * FROM reports WHERE status = ? ORDER BY created_at ASC LIMIT 100`)
      .bind(status)
      .all();
    return json({ items: rows.results });
  }
  const res = path.match(/^\/api\/admin\/reports\/(\d+)\/resolve$/);
  if (res && req.method === 'POST') {
    const body: any = await req.json().catch(() => ({}));
    const to = body?.resolution === 'dismissed' ? 'dismissed' : 'resolved';
    await env.DB.prepare(`UPDATE reports SET status = ?, resolved_by = ?, resolved_at = ? WHERE id = ?`)
      .bind(to, admin.id, Math.floor(Date.now() / 1000), Number(res[1]))
      .run();
    await logAdmin(env.DB, admin.id, 'resolve_report', 'report', Number(res[1]), { to });
    return json({ ok: true });
  }

  // GET /api/admin/posts -> all posts incl. hidden, newest first
  if (path === '/api/admin/posts' && req.method === 'GET') {
    const rows = await env.DB.prepare(
      `SELECT p.*, u.display_name AS author_name FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.status != 'deleted' ORDER BY p.created_at DESC LIMIT 100`,
    ).all();
    return json({ items: rows.results });
  }

  // GET /api/admin/questions -> all questions incl. hidden/closed, newest first
  if (path === '/api/admin/questions' && req.method === 'GET') {
    const rows = await env.DB.prepare(
      `SELECT q.*, u.display_name AS author_name FROM questions q JOIN users u ON u.id = q.author_id
       WHERE q.status != 'deleted' ORDER BY q.created_at DESC LIMIT 100`,
    ).all();
    return json({ items: rows.results });
  }

  // POST /api/admin/questions/:id/delete (soft delete)
  const delQ = path.match(/^\/api\/admin\/questions\/(\d+)\/delete$/);
  if (delQ && req.method === 'POST') {
    const id = Number(delQ[1]);
    const r = await env.DB.prepare(`UPDATE questions SET status = 'deleted' WHERE id = ? AND status != 'deleted'`)
      .bind(id)
      .run();
    if (r.meta.changes === 0) return err('Không tìm thấy', 404);
    await logAdmin(env.DB, admin.id, 'delete_question', 'question', id);
    return json({ ok: true });
  }

  // POST /api/admin/posts/:id/delete (soft delete)
  const delPost = path.match(/^\/api\/admin\/posts\/(\d+)\/delete$/);
  if (delPost && req.method === 'POST') {
    const id = Number(delPost[1]);
    const r = await env.DB.prepare(`UPDATE posts SET status = 'deleted' WHERE id = ? AND status != 'deleted'`)
      .bind(id)
      .run();
    if (r.meta.changes === 0) return err('Không tìm thấy', 404);
    await logAdmin(env.DB, admin.id, 'delete_post', 'post', id);
    return json({ ok: true });
  }

  // POST /api/admin/confessions/:id/delete (hard delete + cleanup reactions/comments)
  const delConf = path.match(/^\/api\/admin\/confessions\/(\d+)\/delete$/);
  if (delConf && req.method === 'POST') {
    const id = Number(delConf[1]);
    const exists = await env.DB.prepare(`SELECT id FROM confessions WHERE id = ?`).bind(id).first();
    if (!exists) return err('Không tìm thấy', 404);
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM reactions WHERE target_type = 'confession' AND target_id = ?`).bind(id),
      env.DB.prepare(`DELETE FROM comments WHERE target_type = 'confession' AND target_id = ?`).bind(id),
      env.DB.prepare(`DELETE FROM confessions WHERE id = ?`).bind(id),
    ]);
    await logAdmin(env.DB, admin.id, 'delete_confession', 'confession', id);
    return json({ ok: true });
  }

  return err('Không tìm thấy chức năng admin', 404);
}
