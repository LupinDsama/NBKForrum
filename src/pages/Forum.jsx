import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MagnifyingGlass, PencilSimple, Question } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, timeAgo } from '../api/client.js';
import { Avatar, SkeletonList, EmptyState } from '../components/ui.jsx';

export default function Forum() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [qTitle, setQTitle] = useState('');
  const [qContent, setQContent] = useState('');
  const [err, setErr] = useState('');
  const [qErr, setQErr] = useState('');
  const activeCat = params.get('category') || '';

  useEffect(() => {
    let alive = true;
    api.get('/api/categories').then((d) => alive && setCategories(d.items || [])).catch(() => {});
    return () => { alive = false; };
  }, []);

  async function load() {
    setPosts(null); setQuestions(null);
    const cat = activeCat ? `&category=${encodeURIComponent(activeCat)}` : '';
    const [p, qs] = await Promise.all([
      api.get(`/api/posts?limit=20${cat}`).catch(() => ({ items: [] })),
      api.get('/api/questions?limit=20').catch(() => ({ items: [] })),
    ]);
    setPosts(p.items || []);
    setQuestions(qs.items || []);
  }
  useEffect(() => { load(); }, [activeCat]);

  const filteredPosts = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle || !posts) return posts;
    return posts.filter((p) => `${p.title} ${p.author_name}`.toLowerCase().includes(needle));
  }, [posts, q]);

  async function submitPost(e) {
    e.preventDefault(); setErr('');
    try {
      await api.post('/api/posts', { title, content });
      setTitle(''); setContent(''); load();
    } catch (ex) { setErr(ex.message); }
  }

  async function submitQuestion(e) {
    e.preventDefault(); setQErr('');
    try {
      await api.post('/api/questions', { title: qTitle, content: qContent });
      setQTitle(''); setQContent(''); load(); setTab('questions');
    } catch (ex) { setQErr(ex.message); }
  }

  return (
    <div className="wrap page">
      <h1>Forum</h1>
      <p className="muted" style={{ maxWidth: '62ch' }}>Thảo luận theo chuyên mục, đặt câu hỏi và trả lời cộng đồng. Bài viết hiện ngay, confession phai qua kiểm duyệt.</p>

      <div className="pills" aria-label="Lọc theo chuyên mục">
        <button className="pill" aria-pressed={!activeCat} onClick={() => setParams({})}>Tất cả</button>
        {categories.map((c) => (
          <button key={c.id} className="pill" aria-pressed={activeCat === c.slug} onClick={() => setParams({ category: c.slug })}>{c.name}</button>
        ))}
      </div>

      <div className="row" style={{ marginBottom: 6 }}>
        <span style={{ position: 'relative', flex: '1 1 240px', maxWidth: 380 }}>
          <MagnifyingGlass size={17} weight="regular" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input aria-label="Tìm bài viết" placeholder="Tìm theo tiêu đề hoac tac gia" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 36 }} />
        </span>
      </div>

      <div className="tabs" role="tablist" aria-label="Loai nội dung">
        <button role="tab" className="tab" aria-selected={tab === 'posts'} onClick={() => setTab('posts')}><PencilSimple size={16} weight="regular" style={{ verticalAlign: -2 }} /> Bài viết</button>
        <button role="tab" className="tab" aria-selected={tab === 'questions'} onClick={() => setTab('questions')}><Question size={16} weight="regular" style={{ verticalAlign: -2 }} /> Hỏi đáp</button>
      </div>

      {tab === 'posts' && (
        <>
          {user && (
            <form className="card" onSubmit={submitPost}>
              <label htmlFor="pt">Tiêu đề bai viet</label>
              <input id="pt" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Ví dụ: Cách ôn thì Vật lý hiệu quả" />
              <label htmlFor="pc">Nội dung</label>
              <textarea id="pc" rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Mô tả chi tiết van để của bạn" />
              <p className="helper">Tối đa 200 ký tự tiêu đề, nội dung văn minh.</p>
              {err && <p className="field-err">{err}</p>}
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn btn-primary" type="submit" disabled={!title.trim() || !content.trim()}>Dang bai</button>
              </div>
            </form>
          )}
          <h2 style={{ marginTop: 26 }}>Bài viết{activeCat ? ` trong ${activeCat}` : ''}</h2>
          {filteredPosts === null && <SkeletonList rows={4} />}
          {filteredPosts !== null && filteredPosts.length === 0 && (
            <EmptyState title="Chưa có bai viet" hint={user ? 'Hãy tạo bài đầu tiên cho chu để này.' : 'Đăng nhập để đăng bài đầu tiên.'} />
          )}
          {filteredPosts !== null && filteredPosts.length > 0 && (
            <div className="list">
              {filteredPosts.map((p) => (
                <article key={p.id} className="card card-flat">
                  <div className="row">
                    <Avatar name={p.author_name} />
                    <div>
                      <Link to={`/posts/${p.id}`} className="post-title">{p.title}</Link>
                      <div className="meta"><span>{p.author_name}</span><span>{timeAgo(p.created_at)}</span>{p.category_name && <span>{p.category_name}</span>}<span>{p.views} lượt xem</span></div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'questions' && (
        <>
          {user && (
            <form className="card" onSubmit={submitQuestion}>
              <label htmlFor="qt">Câu hỏi</label>
              <input id="qt" value={qTitle} onChange={(e) => setQTitle(e.target.value)} maxLength={200} placeholder="Ví dụ: Giải phương trình này thế nào" />
              <label htmlFor="qc">Chi tiết</label>
              <textarea id="qc" rows={4} value={qContent} onChange={(e) => setQContent(e.target.value)} placeholder="Bạn đã thử cách nào" />
              {qErr && <p className="field-err">{qErr}</p>}
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn btn-primary" type="submit" disabled={!qTitle.trim() || !qContent.trim()}>Đặt câu hỏi</button>
              </div>
            </form>
          )}
          <h2 style={{ marginTop: 26 }}>Câu hỏi mới</h2>
          {questions === null && <SkeletonList rows={4} />}
          {questions !== null && questions.length === 0 && <EmptyState title="Chưa có câu hỏi" hint="Đặt câu hỏi đầu tiên để cộng đồng giúp bạn." />}
          {questions !== null && questions.length > 0 && (
            <div className="list">
              {questions.map((item) => (
                <article key={item.id} className="card card-flat">
                  <div className="row">
                    <Avatar name={item.author_name} />
                    <div>
                      <Link to={`/questions/${item.id}`} className="post-title">{item.title}</Link>
                      <div className="meta"><span>{item.author_name}</span><span>{timeAgo(item.created_at)}</span><span>{item.answer_count} trả lời</span></div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
