export interface Env {
  DB: D1Database;
  ADMIN_EMAIL?: string;
  APP_ORIGIN?: string;
}

export interface AuthUser {
  id: number;
  email: string;
  display_name: string;
  role: 'user' | 'admin';
  status: string;
}

export interface AuthedRequest extends Request {
  user?: AuthUser | null;
}
