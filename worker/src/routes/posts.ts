import type { Env } from '../types/index.js';
import { json, err } from '../utils/response.js';
import { str, intParam } from '../utils/validation.js';
import { getSessionUser } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

export async function handlePosts(req: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;

  // GET /api/posts?category=&limit=&offset=
  if (path === '/api/posts' && req.method === 'GET') {
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const cat = url.searchParams.get('category');
    const rows = cat
      ? await env.DB.prepare(
          `SELECT p.*, u.display_name AS author_name, c.name AS category_name
           FROM posts p JOIN users u ON u.id = p.author_id LEFT JOIN categories c ON c.id = p.category_id
           WHERE p.status = 'published' AND c.slug = ? ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
        )
          .bind(cat, limit, offset)
          .all()
      : await env.DB.prepare(
          `SELECT p.*, u.display_name AS author_name, c.name AS category_name
           FROM posts p JOIN users u ON u.id = p.author_id LEFT JOIN categories c ON c.id = p.category_id
           WHERE p.status = 'published' ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
        )
          .bind(limit, offset)
          .all();
    return json({ items: rows.results });
  }

  // POST /api/posts {title,content,category_id?}
  if (path === '/api/posts' && req.method === 'POST') {
    const user = await getSessionUser(req, env);
    if (!user) return err('Bạn chưa đăng nhập', 401);
    const rl = rateLimit(req, 'post', 10, 600);
    if (rl) return rl;
    let body: any;
    try {
      body = await req.json();
    } catch {
      return err('Dữ liệu không hợp lệ', 400);
    }
    const title = str(body.title, 200);
    const content = str(body.content, 50000);
    if (!title || !content) return err('Tiêu đề và nội dung là bắt buộc', 400);
    const categoryId = body.category_id ?? body.categoryId ?? null;
    const now = Math.floor(Date.now() / 1000);
    const r = await env.DB.prepare(
      `INSERT INTO posts (author_id, category_id, title, content, status, views, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'published', 0, ?, ?)`,
    )
      .bind(user.id, categoryId, title, content, now, now)
      .run();
    return json({ id: Number(r.meta.last_row_id) }, 201);
  }

  // GET /api/posts/:id ( increments views )
  const m = path.match(/^\/api\/posts\/(\d+)$/);
  if (m && req.method === 'GET') {
    const id = Number(m[1]);
    const row = await env.DB.prepare(
      `SELECT p.*, u.display_name AS author_name FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = ?`,
    )
      .bind(id)
      .first<any>();
    if (!row || row.status !== 'published') {
      // authors/admins may still view hidden via admin API
      if (!row) return err('Không tìm thấy', 404);
      const user = await getSessionUser(req, env);
      if (!user || (user.id !== row.author_id && user.role !== 'admin')) return err('Không tìm thấy', 404);
    }
    if (row.status === 'published') {
      await env.DB.prepare(`UPDATE posts SET views = views + 1 WHERE id = ?`).bind(id).run();
    }
    const comments = await env.DB.prepare(
      `SELECT c.*, u.display_name AS author_name FROM comments c JOIN users u ON u.id = c.author_id
       WHERE c.target_type = 'post' AND c.target_id = ? ORDER BY c.created_at ASC LIMIT 200`,
    )
      .bind(id)
      .all();
    return json({ post: row, comments: comments.results });
  }

  // DELETE /api/posts/:id (owner or admin)
  if (m && req.method === 'DELETE') {
    const user = await getSessionUser(req, env);
    if (!user) return err('Bạn chưa đăng nhập', 401);
    const id = Number(m[1]);
    const row = await env.DB.prepare(`SELECT * FROM posts WHERE id = ?`).bind(id).first<any>();
    if (!row) return err('Không tìm thấy', 404);
    if (row.author_id !== user.id && user.role !== 'admin') return err('Bạn không có quyền', 403);
    await env.DB.prepare(`UPDATE posts SET status = 'deleted' WHERE id = ?`).bind(id).run();
    return json({ ok: true });
  }

  void intParam;
  return null;
}
