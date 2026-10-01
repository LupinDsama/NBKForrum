# NBK Forum — Tổng kết context

Ngày: 01/10/2026. Repo: `https://github.com/LupinDsama/NBKForrum` (branch `main`).
Ý tưởng gốc: share ChatGPT “Thiết kế forum serverless”
(`https://chatgpt.com/share/6abc2fc0-e948-83ec-afda-e8fc5f083a5e`).

## Link đang chạy

| Mục | URL |
|---|---|
| App chính (Worker 1 deployment: frontend + API) | `https://forum-api.lupindsama.workers.dev` |
| Frontend tĩnh Cloudflare Pages (không backend, chỉ xem) | `https://nbk-forum.pages.dev` |
| Frontend tĩnh GitHub Pages (nhánh `gh-pages`) | `https://lupindsama.github.io/NBKForrum/` |

## Stack (theo guide)

- Frontend: React + Vite + react-router-dom, AuthContext, HttpOnly cookie session
- Backend/API: Cloudflare Workers (TypeScript, `worker/src`, chia routes/middleware/utils/types)
- Database: Cloudflare D1 `forum-db` (`8be936f2-b35a-412f-9587-9e5af6b2d4cc`)
- Thiết kế frontend theo Taste Skill `design-taste-frontend` (1 accent teal, shape lock, dual light/dark, không purple gradient)
- Admin mặc định: `nhantk123vip@gmail.com` (tự lên admin khi đăng ký, check `ADMIN_EMAIL` trong `wrangler.toml`)

## Backend — routes chính (`worker/src`)

- `routes/auth.ts`: `POST /api/auth/register|login|logout`, `GET /api/auth/me`. Hash PBKDF2-SHA256, session chỉ lưu hash token.
- `routes/posts.ts`: CRUD posts (`GET /api/posts`, `POST`, `GET/DELETE /api/posts/:id`, chủ bài hoặc admin).
- `routes/forum.ts`: questions/answers/comments/reports/categories/notifications/`GET /api/users/search` (gợi ý @mention), `notifyMentioned`.
- `routes/confessions.ts`: `POST /api/confessions` → pending; `GET` chỉ approved (ẩn danh); `GET /mine`; `GET /:id` kèm comments (hiện tên thật).
- `routes/reactions.ts`: `GET/POST/DELETE /api/reactions` (like/haha/angry, 1 reaction/user/target).
- `routes/admin.ts`: dashboard, duyệt/từ chối/xóa confession, list/xóa posts/questions, ban/unban, set-role, resolve reports, `admin_logs`.
- `DELETE /api/comments/:id` (chủ hoặc admin, xóa cả cây trả lời), `DELETE /api/notifications[/:id]`, `POST /api/notifications/read-all`.
- `worker/src/index.ts`: router `/api/*` + serve static assets SPA fallback (`[assets] directory="./dist"`, binding `ASSETS`).

## Database (`migrations/`)

- `0001_initial.sql`: users, sessions, categories, posts, questions, answers, comments, confessions, reports, admin_logs, notifications.
- `0002_reactions_replies.sql`: bảng reactions + rebuild comments (thêm `parent_id`, cho `target_type='confession'`).

## Frontend (`src/`)

- Pages: Home, Forum (tab Bài viết/Hỏi đáp, lọc chuyên mục, tìm kiếm), PostDetail/QuestionDetail, Confession (gửi + Bài của tôi + bình luận), Login/Register, Admin (Tổng quan/Duyệt/Đã duyệt/Bài viết/Hỏi đáp/Báo cáo/Người dùng).
- Components: Navbar (menu mobile, nút đăng nhập mobile, chuông), NotifBell (badge chưa đọc, xóa từng cái/xóa hết), Reactions, Comments (threaded, reply, thu hồi, @mention highlight), MentionTextarea (autocomplete @), Footer theo trạng thái login.
- Confession đánh số `#id`; comment hiện tên thật (kể cả admin).

## Các việc đã làm trong session (theo yêu cầu)

1. Dựng backend Worker đầy đủ + schema D1 theo share link.
2. Fix PowerShell ExecutionPolicy (dùng `npm.cmd`/`npx.cmd`), fix `compatibility_date` tương lai.
3. Dựng frontend, cài Taste Skill, build pass.
4. Trạng thái confession cho người gửi (pending/approved/rejected + lý do) + notification khi duyệt/từ chối.
5. Fix Pages trắng: Vite `base`, Router `basename`, API base `VITE_API_URL`, deploy `gh-pages`.
6. Đổi link gọn: Cloudflare Pages `nbk-forum.pages.dev` (`SITE_BASE`, `public/_redirects` — sau bỏ vì Worker tự fallback).
7. Register failed trên Pages (405, không backend) → chuyển single-origin Worker + D1 thật, migrate remote, deploy `forum-api.lupindsama.workers.dev`.
8. Footer theo login, nút login/đăng ký mobile.
9. Reaction like/haha/phẫn nộ, trả lời comment lồng nhau, tag @ (gợi ý tên, hỗ trợ tên có dấu cách dạng `@"Hoai nam"`).
10. Admin xóa post/confession đã duyệt + comment danh nghĩa admin.
11. Thu hồi comment (chủ/admin, xóa cả subtree) + đánh số confession.
12. Thông báo khi bị tag + chuông, xóa từng thông báo/xóa hết, đánh dấu đã đọc.
13. Xóa bài hỏi đáp (chủ/admin) + tab Hỏi đáp trong admin.
14. Việt hóa có dấu toàn UI + message backend (`scripts/vi-polish.cjs`); đã fix 2 lần script chạm nhầm identifier (`setTimeout`, `banned`, `else`, `_base`).

## Deploy & vận hành

```powershell
npm.cmd run build                 # SITE_BASE='/' cho Worker, '/NBKForrum/' cho GH Pages
npm.cmd run worker:deploy         # deploy Worker + frontend
npx.cmd wrangler d1 migrations apply forum-db --remote
powershell -ExecutionPolicy Bypass -File scripts/deploy-pages.ps1  # rebuild + đẩy gh-pages
```

Lưu ý từng gặp:

- Token wrangler hết hạn → `npx.cmd wrangler login` lại.
- Lỗi D1 `7403` thoáng qua → chạy lại lệnh là được.
- API `405` trên Pages = host tĩnh không có backend (đã giải quyết bằng single-origin Worker).
- Tạo admin: đăng ký email admin rồi `UPDATE users SET role='admin' WHERE email='...'`.
- Mỗi lần test production xong đều đã xóa user/dữ liệu probe.

## Việc còn bỏ ngỏ (chưa làm)

- Custom domain riêng (hiện workers.dev lộ tên account `lupindsama`, pages.dev thì không backend).
- Nút Report trên UI (API reports đã có, chưa có nút bấm).
- Repo public vẫn lộ username GitHub (muốn kín thì chuyển Private).
