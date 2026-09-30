import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PaperPlaneTilt, Bell, ChatCircle } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, timeAgo } from '../api/client.js';
import { Avatar, SkeletonList, EmptyState } from '../components/ui.jsx';
import CommentThread from '../components/Comments.jsx';
import Reactions from '../components/Reactions.jsx';

const MAX = 5000;

function StatusBadge({ status }) {
  if (status === 'approved') return <span className="badge badge-accent">Đã duyệt</span>;
  if (status === 'rejected') return <span className="badge">Bị từ chối</span>;
  return <span className="badge">Chờ duyệt</span>;
}

function ConfessionCard({ c, showComments }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  async function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (!detail) {
      try { setDetail(await api.get(`/api/confessions/${c.id}`)); }
      catch { setDetail({ comments: [] }); }
    }
  }

  return (
    <article className="card card-flat">
      <div className="meta"><span className="badge">#{c.id}</span><Avatar name="A" /><span>Ẩn danh</span><span>{timeAgo(c.published_at || c.created_at)}</span></div>
      <p>{c.content}</p>
      <div className="row">
        <Reactions targetType="confession" targetId={c.id} />
        {showComments && (
          <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={toggle}>
            <ChatCircle size={15} weight="regular" />Bình luận{c.comment_count ? ` (${c.comment_count})` : ''}
          </button>
        )}
      </div>
      {showComments && open && (
        <div style={{ marginTop: 12 }}>
          {!detail ? <SkeletonList rows={2} /> : (
            <>
              <p className="helper">Bình luận hiện tên thật, không ẩn danh.</p>
              <CommentThread targetType="confession" targetId={c.id} comments={detail.comments || []} onChanged={async () => {
                setDetail(await api.get(`/api/confessions/${c.id}`).catch(() => detail));
              }} />
            </>
          )}
        </div>
      )}
    </article>
  );
}

export default function Confession() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [mine, setMine] = useState(null);
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);

  async function load() {
    try {
      const d = await api.get('/api/confessions?limit=20');
      setItems(d.items || []);
    } catch {
      setItems([]);
    }
  }

  async function loadMine() {
    if (!user) { setMine(null); setNotes([]); return; }
    try {
      const [m, n] = await Promise.all([
        api.get('/api/confessions/mine'),
        api.get('/api/notifications').catch(() => ({ items: [] })),
      ]);
      setMine(m.items || []);
      setNotes((n.items || []).filter((x) => String(x.type || '').startsWith('confession_')).slice(0, 5));
    } catch {
      setMine([]);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { loadMine(); }, [user]);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setMsg('');
    if (!content.trim()) { setErr('Vui lòng nhap nội dung.'); return; }
    setSending(true);
    try {
      const r = await api.post('/api/confessions', { content: content.trim() });
      setContent('');
      setMsg(`Đã gửi bài #${r.id}. Trạng thái hiện tại: cho duyet. Bạn theo dõi ở mục Bài của tôi bên dưới.`);
      loadMine();
    } catch (ex) { setErr(ex.message); } finally { setSending(false); }
  }

  return (
    <div className="wrap page">
      <h1>Confession</h1>
      <p className="muted" style={{ maxWidth: '62ch' }}>Chia se ẩn danh. Bài ở trạng thái chờ duyệt và chi hiện công khai sau khi admin chấp nhận.</p>
      <div className="grid-2">
        <form className="card" onSubmit={submit}>
          <label htmlFor="cc">Nội dung confession</label>
          <textarea id="cc" rows={6} value={content} onChange={(e) => setContent(e.target.value)} maxLength={MAX} placeholder="Viết điều bạn muốn nói, tối đa 5000 ký tự" />
          <p className="helper">{content.length}/{MAX} ký tự. Không đăng thông tin cá nhân.</p>
          {err && <p className="field-err">{err}</p>}
          {msg && <p className="notice" style={{ marginTop: 10 }}>{msg}</p>}
          {!user && <p className="helper">Bạn có thể gui mà khong can dang nhap, nhung dang nhap thì mới theo doi được trạng thái bai của mình.</p>}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" type="submit" disabled={sending || !content.trim()}>
              <PaperPlaneTilt size={17} weight="regular" />{sending ? 'Đang gửi' : 'Gửi confession'}
            </button>
          </div>
        </form>
        <figure style={{ margin: 0 }}>
          <img className="cover aspect-4x3" alt="Goc học tập yên tĩnh" loading="lazy" src="https://picsum.photos/seed/nbk-confession-desk/800/600" />
        </figure>
      </div>

      {user && (
        <>
          <h2 style={{ marginTop: 30 }}><Bell size={20} weight="regular" style={{ verticalAlign: -3 }} /> Bài của tôi</h2>
          {notes.length > 0 && (
            <div className="list" style={{ marginBottom: 12 }}>
              {notes.map((n) => (
                <p key={n.id} className="notice" style={{ margin: 0 }}><strong>{n.title}:</strong> {n.message}</p>
              ))}
            </div>
          )}
          {mine === null && <SkeletonList rows={2} />}
          {mine !== null && mine.length === 0 && <EmptyState title="Bạn chưa gửi bai nào" hint="Bài bạn gửi khi dang nhap se hiện ở đây kem trạng thái." />}
          {mine !== null && mine.length > 0 && (
            <div className="list">
              {mine.map((c) => (
                <article key={c.id} className="card card-flat">
                  <div className="meta">
                    <span>#{c.id}</span><StatusBadge status={c.status} /><span>{timeAgo(c.created_at)}</span>
                    {c.status === 'approved' && c.published_at && <span>Duyệt {timeAgo(c.published_at)}</span>}
                  </div>
                  <p style={{ marginBottom: c.status === 'rejected' && c.rejection_reason ? 6 : 0 }}>{c.content}</p>
                  {c.status === 'rejected' && c.rejection_reason && (
                    <p className="notice" style={{ marginTop: 8 }}>Lý do tu choi: {c.rejection_reason}</p>
                  )}
                  {c.status === 'pending' && <p className="helper">Đang chờ admin xem. Bạn sẽ thấy thông báo khi co ket qua.</p>}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <h2 style={{ marginTop: 30 }}>Moi được duyet</h2>
      {items === null && <SkeletonList rows={3} />}
      {items !== null && items.length === 0 && <EmptyState title="Chưa có confession" hint="Bài duyệt sẽ hiện o day. Bạn có thể gui bài đầu tiên." action={!user ? <Link to="/login" className="btn btn-ghost">Đăng nhập để theo dõi bài</Link> : null} />}
      {items !== null && items.length > 0 && (
        <div className="list">
          {items.map((c) => (
            <ConfessionCard key={c.id} c={c} showComments />
          ))}
        </div>
      )}
    </div>
  );
}
