import type { Env } from '../types/index.js';
import { json, err } from '../utils/response.js';
import { str } from '../utils/validation.js';
import { getSessionUser } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

// Confession: user submits -> pending; public only sees approved (PHAN 24)
export async function handleConfessions(req: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;

  // GET /api/confessions -> only approved, public sees "Anonymous"
  if (path === '/api/confessions' && req.method === 'GET') {
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const rows = await env.DB.prepare(
      `SELECT cf.id, cf.content, cf.created_at, cf.published_at,
        (SELECT COUNT(*) FROM comments c WHERE c.target_type = 'confession' AND c.target_id = cf.id) AS comment_count
       FROM confessions cf
       WHERE cf.status = 'approved' ORDER BY cf.published_at DESC LIMIT ? OFFSET ?`,
    )
      .bind(limit, offset)
      .all();
    return json({ items: (rows.results as any[]).map((r) => ({ ...r, author: 'Anonymous' })) });
  }

  // POST /api/confessions {content} -> pending (auth optional but tracked if logged in)
  if (path === '/api/confessions' && req.method === 'POST') {
    const rl = rateLimit(req, 'confession', 5, 3600);
    if (rl) return rl;
    const user = await getSessionUser(req, env);
    const body: any = await req.json().catch(() => null);
    const content = str(body?.content, 5000);
    if (!content) return err('content required (1-5000 chars)', 400);
    const now = Math.floor(Date.now() / 1000);
    const r = await env.DB.prepare(
      `INSERT INTO confessions (author_id, content, status, created_at) VALUES (?, ?, 'pending', ?)`,
    )
      .bind(user ? user.id : null, content, now)
      .run();
    return json({ id: Number(r.meta.last_row_id), status: 'pending' }, 201);
  }

  // GET /api/confessions/mine (own submissions with status)
  if (path === '/api/confessions/mine' && req.method === 'GET') {
    const user = await getSessionUser(req, env);
    if (!user) return err('Unauthorized', 401);
    const rows = await env.DB.prepare(`SELECT * FROM confessions WHERE author_id = ? ORDER BY created_at DESC LIMIT 50`)
      .bind(user.id)
      .all();
    return json({ items: rows.results });
  }

  // GET /api/confessions/:id -> approved confession + comments (commenters NOT anonymous)
  const one = path.match(/^\/api\/confessions\/(\d+)$/);
  if (one && req.method === 'GET') {
    const row = await env.DB.prepare(
      `SELECT id, content, created_at, published_at FROM confessions WHERE id = ? AND status = 'approved'`,
    )
      .bind(Number(one[1]))
      .first<any>();
    if (!row) return err('Not found', 404);
    const comments = await env.DB.prepare(
      `SELECT c.*, u.display_name AS author_name FROM comments c JOIN users u ON u.id = c.author_id
       WHERE c.target_type = 'confession' AND c.target_id = ? ORDER BY c.created_at ASC LIMIT 200`,
    )
      .bind(Number(one[1]))
      .all();
    return json({ confession: { ...row, author: 'Anonymous' }, comments: comments.results });
  }

  return null;
}
