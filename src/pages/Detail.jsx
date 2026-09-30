import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, timeAgo } from '../api/client.js';
import { Avatar, SkeletonList } from '../components/ui.jsx';
import CommentThread from '../components/Comments.jsx';
import Reactions from '../components/Reactions.jsx';

export function PostDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState('');

  async function load() {
    try { setData(await api.get(`/api/posts/${id}`)); }
    catch { setFailed('Khong tai duoc bai viet.'); }
  }
  useEffect(() => { load(); }, [id]);

  if (failed) return <div className="wrap page"><p className="field-err">{failed}</p><Link to="/forum">Quay lai forum</Link></div>;
  if (!data) return <div className="wrap page"><SkeletonList rows={3} /></div>;

  return (
    <div className="wrap page">
      <Link to="/forum">Quay lai forum</Link>
      <h1>{data.post?.title}</h1>
      <div className="meta"><Avatar name={data.post?.author_name} /><span>{data.post?.author_name}</span><span>{timeAgo(data.post?.created_at)}</span><span>{data.post?.views} luot xem</span></div>
      <div className="card" style={{ marginTop: 16 }}><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{data.post?.content}</p></div>
      <div style={{ marginTop: 10 }}>
        <Reactions targetType="post" targetId={Number(id)} />
      </div>
      <h2>Binh luan ({(data.comments || []).length})</h2>
      <CommentThread targetType="post" targetId={Number(id)} comments={data.comments || []} onChanged={load} />
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
      <div style={{ marginTop: 10 }}>
        <Reactions targetType="question" targetId={Number(id)} />
      </div>
      <h2>Tra loi ({(data.answers || []).length})</h2>
      <div className="list">
        {(data.answers || []).map((a) => (
          <div key={a.id} className="card card-flat">
            <div className="meta">
              <Avatar name={a.author_name} /><span>{a.author_name}</span><span>{timeAgo(a.created_at)}</span>
              {a.is_accepted ? <span className="badge badge-accent"><CheckCircle size={14} weight="regular" />Da chon</span> : null}
            </div>
            <p>{a.content}</p>
            <div className="row">
              <Reactions targetType="answer" targetId={a.id} />
              {canAccept && !a.is_accepted && (
                <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={async () => {
                  await api.post(`/api/answers/${a.id}/accept`, {});
                  load();
                }}>Chon cau tra loi nay</button>
              )}
            </div>
            <h3 style={{ fontSize: 15, margin: '14px 0 8px' }}>Binh luan</h3>
            <CommentThread targetType="answer" targetId={a.id} comments={(data.answerComments || []).filter((c) => c.target_id === a.id)} onChanged={load} />
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
