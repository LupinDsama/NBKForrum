// VITE_API_URL: base URL of the deployed Worker, e.g. https://forum-api.user.workers.dev
// Empty = same origin (local dev via Vite proxy, or single-origin Worker deploy).
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const apiUrl = (path) => `${API_BASE}${path}`;

async function parse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Lỗi mạng (${res.status})`);
  return data;
}

function opts(method, body) {
  return {
    method,
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
}

export const api = {
  get: (path) => fetch(apiUrl(path), { credentials: 'include' }).then(parse),
  post: (path, body) => fetch(apiUrl(path), opts('POST', body)).then(parse),
  delete: (path) => fetch(apiUrl(path), { method: 'DELETE', credentials: 'include' }).then(parse),
};

export function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor(Date.now() / 1000) - Number(ts);
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d} ngày trước`;
  return new Date(Number(ts) * 1000).toLocaleDateString('vi-VN');
}

export function initialOf(name) {
  const t = String(name || '?').trim();
  return (t[0] || '?').toUpperCase();
}
