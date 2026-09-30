import type { Env } from '../types/index.js';
import { json, err } from '../utils/response.js';
import { str } from '../utils/validation.js';
import { getSessionUser } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

// Questions + Answers + Comments (PHAN 9,10,11)
export async function handleForum(req: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;

  if (path === '/api/questions' && req.method === 'GET') {
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const rows = await env.DB.prepare(
      `SELECT q.*, u.display_name AS author_name,
        (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) AS answer_count
       FROM questions q JOIN users u ON u.id = q.author_id
       WHERE q.status = 'published' ORDER BY q.created_at DESC LIMIT ? OFFSET ?`,
    )
      .bind(limit, offset)
      .all();
    return json({ items: rows.results });
  }

  if (path === '/api/questions' && req.method === 'POST') {
    const user = await getSessionUser(req, env);
    if (!user) return err('Unauthorized', 401);
    const rl = rateLimit(req, 'question', 10, 600);
    if (rl) return rl;
    const body: any = await req.json().catch(() => null);
    if (!body) return err('Invalid JSON', 400);
    const title = str(body.title, 200);
    const content = str(body.content, 50000);
    if (!title || !content) return err('title/content required', 400);
    const now = Math.floor(Date.now() / 1000);
    const r = await env.DB.prepare(
      `INSERT INTO questions (author_id, category_id, title, content, status, views, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'published', 0, ?, ?)`,
    )
      .bind(user.id, body.category_id ?? null, title, content, now, now)
      .run();
    return json({ id: Number(r.meta.last_row_id) }, 201);
  }

  const qm = path.match(/^\/api\/questions\/(\d+)$/);
  if (qm && req.method === 'GET') {
    const id = Number(qm[1]);
    const q = await env.DB.prepare(
      `SELECT q.*, u.display_name AS author_name FROM questions q JOIN users u ON u.id = q.author_id WHERE q.id = ?`,
    )
      .bind(id)
      .first<any>();
    if (!q) return err('Not found', 404);
    await env.DB.prepare(`UPDATE questions SET views = views + 1 WHERE id = ?`).bind(id).run();
    const answers = await env.DB.prepare(
      `SELECT a.*, u.display_name AS author_name FROM answers a JOIN users u ON u.id = a.author_id
       WHERE a.question_id = ? ORDER BY a.is_accepted DESC, a.created_at ASC`,
    )
      .bind(id)
      .all();
    const answerIds = (answers.results as any[]).map((a) => a.id);
    let answerComments: unknown[] = [];
    if (answerIds.length > 0) {
      const placeholders = answerIds.map(() => '?').join(',');
      const cc = await env.DB.prepare(
        `SELECT c.*, u.display_name AS author_name FROM comments c JOIN users u ON u.id = c.author_id
         WHERE c.target_type = 'answer' AND c.target_id IN (${placeholders}) ORDER BY c.created_at ASC LIMIT 500`,
      )
        .bind(...answerIds)
        .all();
      answerComments = cc.results;
    }
    return json({ question: q, answers: answers.results, answerComments });
  }

  // POST /api/questions/:id/answers {content}
  const am = path.match(/^\/api\/questions\/(\d+)\/answers$/);
  if (am && req.method === 'POST') {
    const user = await getSessionUser(req, env);
    if (!user) return err('Unauthorized', 401);
    const body: any = await req.json().catch(() => null);
    const content = str(body?.content, 20000);
    if (!content) return err('content required', 400);
    const now = Math.floor(Date.now() / 1000);
    const r = await env.DB.prepare(
      `INSERT INTO answers (question_id, author_id, content, is_accepted, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
    )
      .bind(Number(am[1]), user.id, content, now, now)
      .run();
    return json({ id: Number(r.meta.last_row_id) }, 201);
  }

  // POST /api/answers/:id/accept (question owner or admin)
  const acc = path.match(/^\/api\/answers\/(\d+)\/accept$/);
  if (acc && req.method === 'POST') {
    const user = await getSessionUser(req, env);
    if (!user) return err('Unauthorized', 401);
    const ans = await env.DB.prepare(`SELECT * FROM answers WHERE id = ?`).bind(Number(acc[1])).first<any>();
    if (!ans) return err('Not found', 404);
    const q = await env.DB.prepare(`SELECT * FROM questions WHERE id = ?`).bind(ans.question_id).first<any>();
    if (!q) return err('Not found', 404);
    if (q.author_id !== user.id && user.role !== 'admin') return err('Forbidden', 403);
    await env.DB.batch([
      env.DB.prepare(`UPDATE answers SET is_accepted = 0 WHERE question_id = ?`).bind(q.id),
      env.DB.prepare(`UPDATE answers SET is_accepted = 1 WHERE id = ?`).bind(ans.id),
      env.DB.prepare(`UPDATE questions SET accepted_answer_id = ? WHERE id = ?`).bind(ans.id, q.id),
    ]);
    return json({ ok: true });
  }

  // POST /api/comments {target_type, target_id, content, parent_id?}
  // parent_id = reply to another comment on the same target. Mentions (@name) are plain text.
  if (path === '/api/comments' && req.method === 'POST') {
    const user = await getSessionUser(req, env);
    if (!user) return err('Unauthorized', 401);
    const body: any = await req.json().catch(() => null);
    const content = str(body?.content, 5000);
    if (!content || !['post', 'question', 'answer', 'confession'].includes(body?.target_type) || !Number.isInteger(body?.target_id)) {
      return err('target_type (post|question|answer|confession), target_id, content required', 400);
    }
    let parentId: number | null = null;
    if (body?.parent_id != null) {
      if (!Number.isInteger(body.parent_id)) return err('parent_id must be numeric', 400);
      const parent = await env.DB.prepare(
        `SELECT id FROM comments WHERE id = ? AND target_type = ? AND target_id = ?`,
      )
        .bind(body.parent_id, body.target_type, body.target_id)
        .first();
      if (!parent) return err('Parent comment not found on this target', 404);
      parentId = body.parent_id;
    }
    const now = Math.floor(Date.now() / 1000);
    const r = await env.DB.prepare(
      `INSERT INTO comments (author_id, target_type, target_id, parent_id, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(user.id, body.target_type, body.target_id, parentId, content, now, now)
      .run();
    return json({ id: Number(r.meta.last_row_id) }, 201);
  }

  // POST /api/reports {target_type, target_id, reason, description?}
  if (path === '/api/reports' && req.method === 'POST') {
    const user = await getSessionUser(req, env);
    if (!user) return err('Unauthorized', 401);
    const body: any = await req.json().catch(() => null);
    const reason = str(body?.reason, 200);
    if (!reason || !body?.target_type || !Number.isInteger(body?.target_id)) return err('target_type, target_id, reason required', 400);
    const now = Math.floor(Date.now() / 1000);
    const r = await env.DB.prepare(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason, description, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?)`,
    )
      .bind(user.id, String(body.target_type), body.target_id, reason, str(body.description, 2000), now)
      .run();
    return json({ id: Number(r.meta.last_row_id) }, 201);
  }

  // GET /api/categories
  if (path === '/api/categories' && req.method === 'GET') {
    const rows = await env.DB.prepare(`SELECT * FROM categories ORDER BY name ASC`).all();
    return json({ items: rows.results });
  }

  // GET /api/notifications (own)
  if (path === '/api/notifications' && req.method === 'GET') {
    const user = await getSessionUser(req, env);
    if (!user) return err('Unauthorized', 401);
    const rows = await env.DB.prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`)
      .bind(user.id)
      .all();
    return json({ items: rows.results });
  }

  return null;
}
