import type { Env } from '../types/index.js';
import { json, err } from '../utils/response.js';
import { getSessionUser } from '../middleware/auth.js';

const KINDS = ['like', 'haha', 'angry'] as const;
const TARGETS = ['post', 'question', 'answer', 'comment', 'confession'] as const;

// GET /api/reactions?target_type=&target_id= -> {counts, mine}
// POST /api/reactions {target_type,target_id,kind} (upsert my reaction, auth)
// DELETE /api/reactions?target_type=&target_id= (remove mine, auth)
export async function handleReactions(req: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (path !== '/api/reactions') return null;

  if (req.method === 'GET') {
    const t = url.searchParams.get('target_type') ?? '';
    const id = Number(url.searchParams.get('target_id'));
    if (!TARGETS.includes(t as (typeof TARGETS)[number]) || !Number.isInteger(id)) {
      return err('target_type + numeric target_id required', 400);
    }
    const rows = await env.DB.prepare(
      `SELECT kind, COUNT(*) AS n FROM reactions WHERE target_type = ? AND target_id = ? GROUP BY kind`,
    )
      .bind(t, id)
      .all<{ kind: string; n: number }>();
    const counts: Record<string, number> = { like: 0, haha: 0, angry: 0 };
    for (const r of rows.results) counts[r.kind] = r.n;
    const user = await getSessionUser(req, env);
    let mine: string | null = null;
    if (user) {
      const row = await env.DB.prepare(
        `SELECT kind FROM reactions WHERE user_id = ? AND target_type = ? AND target_id = ?`,
      )
        .bind(user.id, t, id)
        .first<{ kind: string }>();
      mine = row?.kind ?? null;
    }
    return json({ counts, mine });
  }

  const user = await getSessionUser(req, env);
  if (!user) return err('Unauthorized', 401);

  if (req.method === 'POST') {
    const body: any = await req.json().catch(() => null);
    const t = body?.target_type;
    const id = body?.target_id;
    const kind = body?.kind;
    if (!TARGETS.includes(t) || !Number.isInteger(id) || !KINDS.includes(kind)) {
      return err('target_type, numeric target_id, kind (like|haha|angry) required', 400);
    }
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      `INSERT INTO reactions (user_id, target_type, target_id, kind, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id, target_type, target_id) DO UPDATE SET kind = excluded.kind`,
    )
      .bind(user.id, t, id, kind, now)
      .run();
    return json({ ok: true, kind });
  }

  if (req.method === 'DELETE') {
    const t = url.searchParams.get('target_type') ?? '';
    const id = Number(url.searchParams.get('target_id'));
    if (!TARGETS.includes(t as (typeof TARGETS)[number]) || !Number.isInteger(id)) {
      return err('target_type + numeric target_id required', 400);
    }
    await env.DB.prepare(
      `DELETE FROM reactions WHERE user_id = ? AND target_type = ? AND target_id = ?`,
    )
      .bind(user.id, t, id)
      .run();
    return json({ ok: true });
  }

  return err('Method not allowed', 405);
}
