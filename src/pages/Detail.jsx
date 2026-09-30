import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Trash } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, timeAgo } from '../api/client.js';
import { Avatar, SkeletonList } from '../components/ui.jsx';
import CommentThread from '../components/Comments.jsx';
import MentionTextarea from '../components/MentionTextarea.jsx';
import Reactions from '../components/Reactions.jsx';

export function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState('');

  async function load() {
    try { setData(await api.get(`/api/posts/${id}`)); }
    catch { setFailed('Không tải được bài viết.'); }
  }
  useEffect(() => { load(); }, [id]);

  if (failed) return <div className="wrap page"><p className="field-err">{failed}</p><Link to="/forum">Quay lại forum</Link></div>;
  if (!data) return <div className="wrap page"><SkeletonList rows={3} /></div>;
  const canDeletePost = user && (user.id === data.post?.author_id || user.role === 'admin');

  return (
    <div className="wrap page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Link to="/forum">Quay lại forum</Link>
        {canDeletePost && (
          <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={async () => {
            if (!window.confirm('Xóa bài viết này?')) return;
            await api.delete(`/api/posts/${id}`);
            nav('/forum');
          }}>
            <Trash size={15} weight="regular" />Xóa bài
          </button>
        )}
      </div>
      <h1>{data.post?.title}</h1>
      <div className="meta"><Avatar name={data.post?.author_name} /><span>{data.post?.author_name}</span><span>{timeAgo(data.post?.created_at)}</span><span>{data.post?.views} lượt xem</span></div>
      <div className="card" style={{ marginTop: 16 }}><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{data.post?.content}</p></div>
      <div style={{ marginTop: 10 }}>
        <Reactions targetType="post" targetId={Number(id)} />
      </div>
      <h2>Bình luận ({(data.comments || []).length})</h2>
      <CommentThread targetType="post" targetId={Number(id)} comments={data.comments || []} onChanged={load} />
    </div>
  );
}

export function QuestionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState('');
  const [answer, setAnswer] = useState('');
  const [aErr, setAErr] = useState('');

  async function load() {
    try { setData(await api.get(`/api/questions/${id}`)); }
    catch { setFailed('Không tải được câu hỏi.'); }
  }
  useEffect(() => { load(); }, [id]);

  if (failed) return <div className="wrap page"><p className="field-err">{failed}</p><Link to="/forum">Quay lại forum</Link></div>;
  if (!data) return <div className="wrap page"><SkeletonList rows={3} /></div>;
  const canAccept = user && (user.id === data.question?.author_id || user.role === 'admin');
  const canDeleteQ = user && (user.id === data.question?.author_id || user.role === 'admin');

  return (
    <div className="wrap page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Link to="/forum">Quay lại forum</Link>
        {canDeleteQ && (
          <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={async () => {
            if (!window.confirm('Xóa câu hỏi này? Các câu trả lời cũng bị ẩn theo.')) return;
            await api.delete(`/api/questions/${id}`);
            nav('/forum');
          }}>
            <Trash size={15} weight="regular" />Xóa bài
          </button>
        )}
      </div>
      <h1>{data.question?.title}</h1>
      <div className="meta"><Avatar name={data.question?.author_name} /><span>{data.question?.author_name}</span><span>{timeAgo(data.question?.created_at)}</span></div>
      <div className="card" style={{ marginTop: 16 }}><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{data.question?.content}</p></div>
      <div style={{ marginTop: 10 }}>
        <Reactions targetType="question" targetId={Number(id)} />
      </div>
      <h2>Trả lời ({(data.answers || []).length})</h2>
      <div className="list">
        {(data.answers || []).map((a) => (
          <div key={a.id} className="card card-flat">
            <div className="meta">
              <Avatar name={a.author_name} /><span>{a.author_name}</span><span>{timeAgo(a.created_at)}</span>
              {a.is_accepted ? <span className="badge badge-accent"><CheckCircle size={14} weight="regular" />Đã chọn</span> : null}
            </div>
            <p>{a.content}</p>
            <div className="row">
              <Reactions targetType="answer" targetId={a.id} />
              {canAccept && !a.is_accepted && (
                <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={async () => {
                  await api.post(`/api/answers/${a.id}/accept`, {});
                  load();
                }}>Chọn câu trả lời này</button>
              )}
            </div>
            <h3 style={{ fontSize: 15, margin: '14px 0 8px' }}>Bình luận</h3>
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
          <label htmlFor="qa">Câu trả lời của bạn</label>
          <MentionTextarea id="qa" rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={20000} placeholder="Trả lời cụ thể, kèm ví dụ nếu có" />
          {aErr && <p className="field-err">{aErr}</p>}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" type="submit" disabled={!answer.trim()}>Gửi trả lời</button>
          </div>
        </form>
      ) : (
        <p className="notice"><Link to="/login">Đăng nhập</Link> để trả lời.</p>
      )}
    </div>
  );
}
