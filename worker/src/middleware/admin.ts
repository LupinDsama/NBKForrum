import type { AuthUser } from '../types/index.js';
import { json } from '../utils/response.js';

export function requireAdmin(user: AuthUser | null): Response | null {
  if (!user) return json({ error: 'Bạn chưa đăng nhập' }, 401);
  if (user.role !== 'admin') return json({ error: 'Bạn không có quyền' }, 403);
  return null;
}

export async function logAdmin(
  db: D1Database,
  adminId: number,
  action: string,
  targetType: string | null,
  targetId: number | null,
  metadata?: unknown,
): Promise<void> {
  await db
    .prepare(`INSERT INTO admin_logs (admin_id, action, target_type, target_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(adminId, action, targetType, targetId, metadata ? JSON.stringify(metadata) : null, Math.floor(Date.now() / 1000))
    .run();
}
