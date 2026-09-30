import type { Env } from './types/index.js';
import { json } from './utils/response.js';
import { handleAuth } from './routes/auth.js';
import { handlePosts } from './routes/posts.js';
import { handleForum } from './routes/forum.js';
import { handleConfessions } from './routes/confessions.js';
import { handleReactions } from './routes/reactions.js';
import { handleAdmin } from './routes/admin.js';

function cors(req: Request, env: Env): HeadersInit {
  // Same-origin deploy (PHAN 36): frontend + /api on one Worker -> no CORS needed.
  // If split domains, set APP_ORIGIN and allow credentials.
  const origin = req.headers.get('origin');
  if (env.APP_ORIGIN && origin === env.APP_ORIGIN) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  }
  return {};
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(request, env) as HeadersInit });
    }

    // Health
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return json({ ok: true, message: 'Forum API is working' });
    }

    const handlers = [handleAuth, handleAdmin, handlePosts, handleForum, handleConfessions, handleReactions];
    for (const h of handlers) {
      const res = await h(request, env, url);
      if (res) {
        const extra = cors(request, env);
        if (Object.keys(extra).length) {
          const headers = new Headers(res.headers);
          for (const [k, v] of Object.entries(extra)) headers.set(k, v as string);
          return new Response(res.body, { status: res.status, headers });
        }
        return res;
      }
    }

    // Seed default categories (idempotent, admin-only convenience)
    if (url.pathname === '/api/admin/seed-categories' && request.method === 'POST') {
      const { getSessionUser } = await import('./middleware/auth.js');
      const user = await getSessionUser(request, env);
      if (!user || user.role !== 'admin') return json({ error: 'Bạn không có quyền' }, 403);
      const now = Math.floor(Date.now() / 1000);
      for (const [name, slug] of [
        ['Programming', 'programming'],
        ['Physics', 'physics'],
        ['Mathematics', 'mathematics'],
        ['Gaming', 'gaming'],
        ['General', 'general'],
      ] as const) {
        await env.DB.prepare(`INSERT OR IGNORE INTO categories (name, slug, created_at) VALUES (?, ?, ?)`)
          .bind(name, slug, now)
          .run();
      }
      return json({ ok: true });
    }

    if (url.pathname.startsWith('/api/')) return json({ error: 'Không tìm thấy' }, 404);

    // Frontend static assets + SPA fallback to index.html
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;
    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
  },
};
