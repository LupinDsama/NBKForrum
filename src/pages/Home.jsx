import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChatCircleText, Question, ShieldCheck } from '@phosphor-icons/react';
import { api, timeAgo } from '../api/client.js';
import { Avatar, SkeletonList, EmptyState } from '../components/ui.jsx';

const CATS = [
  { slug: 'programming', name: 'Lập trình', seed: 'nbk-code-desk' },
  { slug: 'physics', name: 'Vật lý', seed: 'nbk-physics-lab' },
  { slug: 'mathematics', name: 'Toán học', seed: 'nbk-math-notes' },
  { slug: 'gaming', name: 'Gaming', seed: 'nbk-game-room' },
  { slug: 'general', name: 'Chung', seed: 'nbk-campus-yard' },
];

export default function Home() {
  const [posts, setPosts] = useState(null);
  const [confessions, setConfessions] = useState(null);
  const [failed, setFailed] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get('/api/posts?limit=5').catch(() => ({ items: [] })),
      api.get('/api/confessions?limit=3').catch(() => ({ items: [] })),
    ]).then(([p, c]) => {
      if (!alive) return;
      setPosts(p.items || []);
      setConfessions(c.items || []);
    }).catch(() => alive && setFailed('Không tải được du lieu. Vui lòng tải lại trang.'));
    return () => { alive = false; };
  }, []);

  return (
    <div className="wrap">
      <section className="hero">
        <div className="hero-grid">
          <div>
            <h1>Diễn đàn học tập và chia sẻ thật</h1>
            <p>Hỏi đáp Lập trình, Vật lý, Toán và Gaming, cùng confession ẩn danh được kiểm duyệt trước khi hiện.</p>
            <div className="row">
              <Link to="/forum" className="btn btn-primary">Vào forum<ArrowRight size={17} weight="regular" /></Link>
              <Link to="/confession" className="btn btn-ghost">Gửi confession</Link>
            </div>
          </div>
          <figure>
            <img className="cover aspect-4x3" alt="Nhóm học sinh trao đổi trong thư viện" src="https://picsum.photos/seed/nbk-forum-hall/880/660" loading="eager" />
          </figure>
        </div>
      </section>

      <hr className="divider" />

      <section aria-label="Chuyên mục">
        <h2>Chuyên mục</h2>
        <div className="pills" role="list">
          {CATS.map((c) => (
            <Link key={c.slug} role="listitem" className="pill" style={{ textDecoration: 'none' }} to={`/forum?category=${c.slug}`}>{c.name}</Link>
          ))}
        </div>
        <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {CATS.slice(0, 2).map((c) => (
            <figure key={c.slug} style={{ margin: 0 }}>
              <img className="cover aspect-16x10" alt={`Không gian ${c.name}`} loading="lazy" src={`https://picsum.photos/seed/${c.seed}/760/475`} />
            </figure>
          ))}
        </div>
      </section>

      <hr className="divider" />

      <section className="grid-2" aria-label="Mới nhat">
        <div>
          <h2><ChatCircleText size={20} weight="regular" style={{ verticalAlign: -3 }} /> Bài viết mới</h2>
          {posts === null && !failed && <SkeletonList rows={3} />}
          {failed && <p className="field-err">{failed}</p>}
          {posts !== null && posts.length === 0 && (
            <EmptyState title="Chưa có bài viết" hint="Hãy là người đầu tiên đặt câu hỏi cho cộng đồng." action={<Link to="/forum" className="btn btn-primary">Đăng bài</Link>} />
          )}
          {posts !== null && posts.length > 0 && (
            <div className="list">
              {posts.map((p) => (
                <article key={p.id} className="card card-flat">
                  <div className="row">
                    <Avatar name={p.author_name} />
                    <div>
                      <Link to={`/posts/${p.id}`} className="post-title">{p.title}</Link>
                      <div className="meta"><span>{p.author_name}</span><span>{timeAgo(p.created_at)}</span>{p.category_name && <span>{p.category_name}</span>}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2><ShieldCheck size={20} weight="regular" style={{ verticalAlign: -3 }} /> Confession đã duyệt</h2>
          {confessions === null && !failed && <SkeletonList rows={2} />}
          {confessions !== null && confessions.length === 0 && (
            <EmptyState title="Chưa có confession" hint="Bài gửi sẽ hiện ở đây sau khi admin phê duyệt." />
          )}
          {confessions !== null && confessions.length > 0 && (
            <div className="list">
              {confessions.map((c) => (
                <article key={c.id} className="card card-flat">
                  <div className="meta"><span className="badge">#{c.id}</span><Avatar name="A" /><span>Ẩn danh</span><span>{timeAgo(c.published_at || c.created_at)}</span></div>
                  <p className="clamp-3">{c.content}</p>
                  <Link to="/confession">Đọc thêm</Link>
                </article>
              ))}
            </div>
          )}
          <h2 style={{ marginTop: 28 }}><Question size={20} weight="regular" style={{ verticalAlign: -3 }} /> Cách confession hoạt động</h2>
          <div className="card card-flat">
            <p className="muted" style={{ margin: 0 }}>Gửi bài ở trạng thái chờ duyệt. Admin xem nội dung thật, cộng đồng chỉ thấy chữ Ẩn danh.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
