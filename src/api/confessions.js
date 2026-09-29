// Frontend caller for Confession (guide follow-up: "viết API backend cho Confession + frontend React gọi API").
// Backend: POST /api/confessions {content} -> {id, status:'pending'} ; GET /api/confessions -> approved only (author='Anonymous').
export async function submitConfession(content) {
  const res = await fetch('/api/confessions', {
    method: 'POST',
    credentials: 'include', // send HttpOnly session cookie
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Submit failed');
  return res.json();
}

export async function listConfessions(limit = 20, offset = 0) {
  const res = await fetch(`/api/confessions?limit=${limit}&offset=${offset}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Load failed');
  return res.json();
}

// Admin:
export async function listPendingConfessions() {
  const res = await fetch('/api/admin/confessions?status=pending', { credentials: 'include' });
  if (!res.ok) throw new Error('Forbidden');
  return res.json();
}
export async function approveConfession(id) {
  const res = await fetch(`/api/admin/confessions/${id}/approve`, { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error('Approve failed');
}
export async function rejectConfession(id, reason) {
  const res = await fetch(`/api/admin/confessions/${id}/reject`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error('Reject failed');
}
