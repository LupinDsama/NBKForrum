# NBK Forum — backend Worker ("Thiết kế forum serverless")

https://nbk-forum.pages.dev

Stack đúng guide: React+Vite + Cloudflare Workers + D1 + R2 (optional), session HttpOnly cookie,
admin `nhantk123vip@gmail.com`, confession `pending → approved/rejected`.

## Cấu trúc đã dựng

```text
migrations/0001_initial.sql   users/sessions/categories/posts/questions/answers/comments/confessions/reports/admin_logs/notifications
wrangler.toml                 binding DB=forum-db, ADMIN_EMAIL
worker/src/index.ts           router /api/* + CORS + /api/health
worker/src/routes/auth.ts     register/login/logout/me (PBKDF2, session hash, auto-admin theo ADMIN_EMAIL)
worker/src/routes/posts.ts    CRUD posts
worker/src/routes/forum.ts    questions/answers/comments/reports/categories/notifications
worker/src/routes/confessions.ts  POST pending, GET approved-only (Anonymous)
worker/src/routes/admin.ts    dashboard/confessions approve-reject/users ban-role/reports + admin_logs
src/api/confessions.js        ví dụ frontend gọi API confession
```

## Chạy kiểm tra (PHẦN 17-18, 36-38)

```bash
npm.cmd install
npx wrangler d1 create forum-db
# chép database_id vào wrangler.toml
npm run db:migrate:local
npx wrangler d1 execute forum-db --local --command="SELECT name FROM sqlite_master WHERE type='table';"
npm run worker:dev
```

Test:

```bash
curl http://localhost:8787/api/health
curl -X POST http://localhost:8787/api/auth/register -H "content-type: application/json" -d "{\"email\":\"user@gmail.com\",\"password\":\"MyPassword123!\",\"displayName\":\"User123\"}"
```

Tạo admin (sau khi đăng ký `nhantk123vip@gmail.com`):

```sql
UPDATE users SET role = 'admin' WHERE email = 'nhantk123vip@gmail.com';
```

Deploy: `npm run db:migrate:remote` rồi `npm run worker:deploy`.

## Lưu ý bảo mật theo guide

- Không lưu password plaintext; hash PBKDF2-SHA256 100k iterations + salt.
- Không lưu session token plaintext; chỉ lưu sha256(token).
- Mọi `/api/admin/*` check `role === 'admin'` phía server, frontend chỉ ẩn/hiện nút.
- Public confession chỉ query `status='approved'`; pending không lộ.
- Dùng prepared statements (`?` bind), không nối chuỗi SQL.
