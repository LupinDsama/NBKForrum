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
  if (status === 'approved') return <span className="badge badge-accent">Da duyet</span>;
  if (status === 'rejected') return <span className="badge">Bi tu choi</span>;
  return <span className="badge">Cho duyet</span>;
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
      <div className="meta"><Avatar name="A" /><span>An danh</span><span>{timeAgo(c.published_at || c.created_at)}</span></div>
      <p>{c.content}</p>
      <div className="row">
        <Reactions targetType="confession" targetId={c.id} />
        {showComments && (
          <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={toggle}>
            <ChatCircle size={15} weight="regular" />Binh luan{c.comment_count ? ` (${c.comment_count})` : ''}
          </button>
        )}
      </div>
      {showComments && open && (
        <div style={{ marginTop: 12 }}>
          {!detail ? <SkeletonList rows={2} /> : (
            <>
              <p className="helper">Binh luan hien ten that, khong an danh.</p>
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
    if (!content.trim()) { setErr('Vui long nhap noi dung.'); return; }
    setSending(true);
    try {
      const r = await api.post('/api/confessions', { content: content.trim() });
      setContent('');
      setMsg(`Da gui bai #${r.id}. Trang thai hien tai: cho duyet. Ban theo doi o muc Bai cua toi ben duoi.`);
      loadMine();
    } catch (ex) { setErr(ex.message); } finally { setSending(false); }
  }

  return (
    <div className="wrap page">
      <h1>Confession</h1>
      <p className="muted" style={{ maxWidth: '62ch' }}>Chia se an danh. Bai o trang thai cho duyet va chi hien cong khai sau khi admin chap nhan.</p>
      <div className="grid-2">
        <form className="card" onSubmit={submit}>
          <label htmlFor="cc">Noi dung confession</label>
          <textarea id="cc" rows={6} value={content} onChange={(e) => setContent(e.target.value)} maxLength={MAX} placeholder="Viet dieu ban muon noi, toi da 5000 ky tu" />
          <p className="helper">{content.length}/{MAX} ky tu. Khong dang thong tin ca nhan.</p>
          {err && <p className="field-err">{err}</p>}
          {msg && <p className="notice" style={{ marginTop: 10 }}>{msg}</p>}
          {!user && <p className="helper">Ban co the gui ma khong can dang nhap, nhung dang nhap thi moi theo doi duoc trang thai bai cua minh.</p>}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" type="submit" disabled={sending || !content.trim()}>
              <PaperPlaneTilt size={17} weight="regular" />{sending ? 'Dang gui' : 'Gui confession'}
            </button>
          </div>
        </form>
        <figure style={{ margin: 0 }}>
          <img className="cover aspect-4x3" alt="Goc hoc tap yen tinh" loading="lazy" src="https://picsum.photos/seed/nbk-confession-desk/800/600" />
        </figure>
      </div>

      {user && (
        <>
          <h2 style={{ marginTop: 30 }}><Bell size={20} weight="regular" style={{ verticalAlign: -3 }} /> Bai cua toi</h2>
          {notes.length > 0 && (
            <div className="list" style={{ marginBottom: 12 }}>
              {notes.map((n) => (
                <p key={n.id} className="notice" style={{ margin: 0 }}><strong>{n.title}:</strong> {n.message}</p>
              ))}
            </div>
          )}
          {mine === null && <SkeletonList rows={2} />}
          {mine !== null && mine.length === 0 && <EmptyState title="Ban chua gui bai nao" hint="Bai ban gui khi dang nhap se hien o day kem trang thai." />}
          {mine !== null && mine.length > 0 && (
            <div className="list">
              {mine.map((c) => (
                <article key={c.id} className="card card-flat">
                  <div className="meta">
                    <span>#{c.id}</span><StatusBadge status={c.status} /><span>{timeAgo(c.created_at)}</span>
                    {c.status === 'approved' && c.published_at && <span>Duyet {timeAgo(c.published_at)}</span>}
                  </div>
                  <p style={{ marginBottom: c.status === 'rejected' && c.rejection_reason ? 6 : 0 }}>{c.content}</p>
                  {c.status === 'rejected' && c.rejection_reason && (
                    <p className="notice" style={{ marginTop: 8 }}>Ly do tu choi: {c.rejection_reason}</p>
                  )}
                  {c.status === 'pending' && <p className="helper">Dang cho admin xem. Ban se thay thong bao khi co ket qua.</p>}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <h2 style={{ marginTop: 30 }}>Moi duoc duyet</h2>
      {items === null && <SkeletonList rows={3} />}
      {items !== null && items.length === 0 && <EmptyState title="Chua co confession" hint="Bai duyet se hien o day. Ban co the gui bai dau tien." action={!user ? <Link to="/login" className="btn btn-ghost">Dang nhap de theo doi bai</Link> : null} />}
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
