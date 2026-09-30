import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChatCircleText, Question, ShieldCheck } from '@phosphor-icons/react';
import { api, timeAgo } from '../api/client.js';
import { Avatar, SkeletonList, EmptyState } from '../components/ui.jsx';

const CATS = [
  { slug: 'programming', name: 'Lap trinh', seed: 'nbk-code-desk' },
  { slug: 'physics', name: 'Vat ly', seed: 'nbk-physics-lab' },
  { slug: 'mathematics', name: 'Toan hoc', seed: 'nbk-math-notes' },
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
    }).catch(() => alive && setFailed('Khong tai duoc du lieu. Vui long tai lai trang.'));
    return () => { alive = false; };
  }, []);

  return (
    <div className="wrap">
      <section className="hero">
        <div className="hero-grid">
          <div>
            <h1>Dien dan hoc tap va chia se that</h1>
            <p>Hoi dap Lap trinh, Vat ly, Toan va Gaming, cung confession an danh duoc kiem duyet truoc khi hien.</p>
            <div className="row">
              <Link to="/forum" className="btn btn-primary">Vao forum<ArrowRight size={17} weight="regular" /></Link>
              <Link to="/confession" className="btn btn-ghost">Gui confession</Link>
            </div>
          </div>
          <figure>
            <img className="cover aspect-4x3" alt="Nhom hoc sinh trao doi trong thu vien" src="https://picsum.photos/seed/nbk-forum-hall/880/660" loading="eager" />
          </figure>
        </div>
      </section>

      <hr className="divider" />

      <section aria-label="Chuyen muc">
        <h2>Chuyen muc</h2>
        <div className="pills" role="list">
          {CATS.map((c) => (
            <Link key={c.slug} role="listitem" className="pill" style={{ textDecoration: 'none' }} to={`/forum?category=${c.slug}`}>{c.name}</Link>
          ))}
        </div>
        <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {CATS.slice(0, 2).map((c) => (
            <figure key={c.slug} style={{ margin: 0 }}>
              <img className="cover aspect-16x10" alt={`Khong gian ${c.name}`} loading="lazy" src={`https://picsum.photos/seed/${c.seed}/760/475`} />
            </figure>
          ))}
        </div>
      </section>

      <hr className="divider" />

      <section className="grid-2" aria-label="Moi nhat">
        <div>
          <h2><ChatCircleText size={20} weight="regular" style={{ verticalAlign: -3 }} /> Bai viet moi</h2>
          {posts === null && !failed && <SkeletonList rows={3} />}
          {failed && <p className="field-err">{failed}</p>}
          {posts !== null && posts.length === 0 && (
            <EmptyState title="Chua co bai viet" hint="Hay la nguoi dau tien dat cau hoi cho cong dong." action={<Link to="/forum" className="btn btn-primary">Dang bai</Link>} />
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
          <h2><ShieldCheck size={20} weight="regular" style={{ verticalAlign: -3 }} /> Confession da duyet</h2>
          {confessions === null && !failed && <SkeletonList rows={2} />}
          {confessions !== null && confessions.length === 0 && (
            <EmptyState title="Chua co confession" hint="Bai gui se hien o day sau khi admin phe duyet." />
          )}
          {confessions !== null && confessions.length > 0 && (
            <div className="list">
              {confessions.map((c) => (
                <article key={c.id} className="card card-flat">
                  <div className="meta"><span className="badge">#{c.id}</span><Avatar name="A" /><span>An danh</span><span>{timeAgo(c.published_at || c.created_at)}</span></div>
                  <p className="clamp-3">{c.content}</p>
                  <Link to="/confession">Doc them</Link>
                </article>
              ))}
            </div>
          )}
          <h2 style={{ marginTop: 28 }}><Question size={20} weight="regular" style={{ verticalAlign: -3 }} /> Cach confession hoat dong</h2>
          <div className="card card-flat">
            <p className="muted" style={{ margin: 0 }}>Gui bai o trang thai cho duyet. Admin xem noi dung that, cong dong chi thay chu An danh.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
