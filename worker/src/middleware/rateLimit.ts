// Minimal in-memory fixed-window rate limit (per isolate). For production,
// put this behind Cloudflare Rate Limiting / Turnstile on register/login/post.
const hits = new Map<string, { n: number; reset: number }>();

export function rateLimit(req: Request, key: string, limit = 30, windowSec = 60): Response | null {
  const ip = req.headers.get('cf-connecting-ip') ?? 'local';
  const k = `${key}:${ip}`;
  const now = Date.now();
  const cur = hits.get(k);
  if (!cur || now > cur.reset) {
    hits.set(k, { n: 1, reset: now + windowSec * 1000 });
    return null;
  }
  cur.n += 1;
  if (cur.n > limit) {
    return new Response(JSON.stringify({ error: 'Bạn thao tác quá nhanh, thử lại sau' }), { status: 429 });
  }
  return null;
}
