import { useEffect, useState } from 'react';
import { PaperPlaneTilt } from '@phosphor-icons/react';
import { api, timeAgo } from '../api/client.js';
import { Avatar, SkeletonList, EmptyState } from '../components/ui.jsx';

const MAX = 5000;

export default function Confession() {
  const [items, setItems] = useState(null);
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
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setMsg('');
    if (!content.trim()) { setErr('Vui long nhap noi dung.'); return; }
    setSending(true);
    try {
      await api.post('/api/confessions', { content: content.trim() });
      setContent('');
      setMsg('Da gui. Bai se hien sau khi admin phe duyet.');
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
      <h2 style={{ marginTop: 30 }}>Moi duoc duyet</h2>
      {items === null && <SkeletonList rows={3} />}
      {items !== null && items.length === 0 && <EmptyState title="Chua co confession" hint="Bai duyet se hien o day. Ban co the gui bai dau tien." />}
      {items !== null && items.length > 0 && (
        <div className="list">
          {items.map((c) => (
            <article key={c.id} className="card card-flat">
              <div className="meta"><Avatar name="A" /><span>An danh</span><span>{timeAgo(c.published_at || c.created_at)}</span></div>
              <p style={{ marginBottom: 0 }}>{c.content}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
