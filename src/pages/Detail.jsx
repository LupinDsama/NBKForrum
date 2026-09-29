import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, timeAgo } from '../api/client.js';
import { Avatar, SkeletonList, EmptyState } from '../components/ui.jsx';

export function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState('');
  const [comment, setComment] = useState('');
  const [cErr, setCErr] = useState('');

  useEffect(() => {
    let alive = true;
    api.get(`/api/posts/${id}`).then((d) => alive && setData(d)).catch(() => alive && setFailed('Khong tai duoc bai viet.'));
    return () => { alive = false; };
  }, [id]);

  async function sendComment(e) {
    e.preventDefault(); setCErr('');
    try {
      await api.post('/api/comments', { target_type: 'post', target_id: Number(id), content: comment.trim() });
      setComment('');
      setData(await api.get(`/api/posts/${id}`));
    } catch (ex) { setCErr(ex.message); }
  }

  if (failed) return <div className="wrap page"><p className="field-err">{failed}</p><Link to="/forum">Quay lai forum</Link></div>;
  if (!data) return <div className="wrap page"><SkeletonList rows={3} /></div>;

  return (
    <div className="wrap page">
      <Link to="/forum">Quay lai forum</Link>
      <h1>{data.post?.title}</h1>
      <div className="meta"><Avatar name={data.post?.author_name} /><span>{data.post?.author_name}</span><span>{timeAgo(data.post?.created_at)}</span><span>{data.post?.views} luot xem</span></div>
      <div className="card" style={{ marginTop: 16 }}><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{data.post?.content}</p></div>
      <h2>Binh luan ({(data.comments || []).length})</h2>
      {(data.comments || []).length === 0 && <EmptyState title="Chua co binh luan" hint="Hay la nguoi dau tien chia se goc nhin." />}
      <div className="list">
        {(data.comments || []).map((c) => (
          <div key={c.id} className="card card-flat">
            <div className="meta"><Avatar name={c.author_name} /><span>{c.author_name}</span><span>{timeAgo(c.created_at)}</span></div>
            <p style={{ marginBottom: 0 }}>{c.content}</p>
          </div>
        ))}
      </div>
      {user ? (
        <form className="card" style={{ marginTop: 16 }} onSubmit={sendComment}>
          <label htmlFor="pcomment">Binh luan cua ban</label>
          <textarea id="pcomment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={5000} placeholder="Viet lich su, dung trong tam" />
          {cErr && <p className="field-err">{cErr}</p>}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" type="submit" disabled={!comment.trim()}>Gui binh luan</button>
          </div>
        </form>
      ) : (
        <p className="notice"><Link to="/login">Dang nhap</Link> de binh luan.</p>
      )}
    </div>
  );
}

export function QuestionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState('');
  const [answer, setAnswer] = useState('');
  const [aErr, setAErr] = useState('');

  async function load() {
    try { setData(await api.get(`/api/questions/${id}`)); }
    catch { setFailed('Khong tai duoc cau hoi.'); }
  }
  useEffect(() => { load(); }, [id]);

  if (failed) return <div className="wrap page"><p className="field-err">{failed}</p><Link to="/forum">Quay lai forum</Link></div>;
  if (!data) return <div className="wrap page"><SkeletonList rows={3} /></div>;
  const canAccept = user && (user.id === data.question?.author_id || user.role === 'admin');

  return (
    <div className="wrap page">
      <Link to="/forum">Quay lai forum</Link>
      <h1>{data.question?.title}</h1>
      <div className="meta"><Avatar name={data.question?.author_name} /><span>{data.question?.author_name}</span><span>{timeAgo(data.question?.created_at)}</span></div>
      <div className="card" style={{ marginTop: 16 }}><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{data.question?.content}</p></div>
      <h2>Tra loi ({(data.answers || []).length})</h2>
      <div className="list">
        {(data.answers || []).map((a) => (
          <div key={a.id} className="card card-flat">
            <div className="meta">
              <Avatar name={a.author_name} /><span>{a.author_name}</span><span>{timeAgo(a.created_at)}</span>
              {a.is_accepted ? <span className="badge badge-accent"><CheckCircle size={14} weight="regular" />Da chon</span> : null}
            </div>
            <p>{a.content}</p>
            {canAccept && !a.is_accepted && (
              <button className="btn btn-ghost" onClick={async () => {
                await api.post(`/api/answers/${a.id}/accept`, {});
                load();
              }}>Chon cau tra loi nay</button>
            )}
          </div>
        ))}
      </div>
      {user ? (
        <form className="card" style={{ marginTop: 16 }} onSubmit={async (e) => {
          e.preventDefault(); setAErr('');
          try {
            await api.post(`/api/questions/${id}/answers`, { content: answer.trim() });
            setAnswer(''); load();
          } catch (ex) { setAErr(ex.message); }
        }}>
          <label htmlFor="qa">Cau tra loi cua ban</label>
          <textarea id="qa" rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={20000} placeholder="Tra loi cu the, kem vi du neu co" />
          {aErr && <p className="field-err">{aErr}</p>}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" type="submit" disabled={!answer.trim()}>Gui tra loi</button>
          </div>
        </form>
      ) : (
        <p className="notice"><Link to="/login">Dang nhap</Link> de tra loi.</p>
      )}
    </div>
  );
}
