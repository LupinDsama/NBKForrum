import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChatCircle, ArrowBendUpLeft } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, timeAgo } from '../api/client.js';
import { Avatar } from './ui.jsx';
import Reactions from './Reactions.jsx';
import MentionTextarea from './MentionTextarea.jsx';

// Render @mentions as highlighted tokens. Multi-word names are stored
// quoted (@"Hoai nam") so the whole name highlights. Content stays plain text.
export function MentionText({ text }) {
  const parts = String(text || '').split(/(@"[^"\n]{1,60}"|@[^\s@]{1,50})/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.length < 2 || !p.startsWith('@')) return <span key={i}>{p}</span>;
        const label = p.startsWith('@"') ? `@${p.slice(2, -1)}` : p;
        return <span key={i} className="mention">{label}</span>;
      })}
    </>
  );
}

function buildTree(flat) {
  const byId = new Map(flat.map((c) => [c.id, { ...c, replies: [] }]));
  const roots = [];
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) byId.get(node.parent_id).replies.push(node);
    else roots.push(node);
  }
  return roots;
}

function CommentNode({ node, targetType, targetId, onReply, onChanged, depth }) {
  const { user } = useAuth();
  const canDelete = user && (user.id === node.author_id || user.role === 'admin');

  async function recall() {
    if (!window.confirm('Thu hồi bình luận này? Cac trả lời bên dưới cũng bị xóa.')) return;
    await api.delete(`/api/comments/${node.id}`);
    onChanged && onChanged();
  }

  return (
    <div className={depth > 0 ? 'reply-indent' : undefined}>
      <div className="card card-flat">
        <div className="meta"><Avatar name={node.author_name} /><span>{node.author_name}</span><span>{timeAgo(node.created_at)}</span></div>
        <p style={{ margin: '8px 0' }}><MentionText text={node.content} /></p>
        <div className="row">
          <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => onReply(node)}>
            <ChatCircle size={15} weight="regular" />Trả lời
          </button>
          {canDelete && (
            <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={recall}>
              <ArrowBendUpLeft size={15} weight="regular" />Thu hồi
            </button>
          )}
          <Reactions targetType="comment" targetId={node.id} />
        </div>
      </div>
      {node.replies.length > 0 && (
        <div className="list" style={{ marginTop: 8 }}>
          {node.replies.map((r) => (
            <CommentNode key={r.id} node={r} targetType={targetType} targetId={targetId} onReply={onReply} onChanged={onChanged} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// Threaded comment list + reply box. Set hideForm to render list only.
export default function CommentThread({ targetType, targetId, comments, onChanged, hideForm }) {
  const { user } = useAuth();
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [err, setErr] = useState('');

  function startReply(node) {
    setReplyTo(node);
    setDraft(`@${node.author_name} `);
    document.getElementById(`comment-box-${targetType}-${targetId}`)?.focus();
  }

  async function submit(e) {
    e.preventDefault(); setErr('');
    if (!draft.trim()) return;
    try {
      await api.post('/api/comments', {
        target_type: targetType,
        target_id: Number(targetId),
        content: draft.trim(),
        parent_id: replyTo ? replyTo.id : null,
      });
      setDraft(''); setReplyTo(null);
      onChanged && onChanged();
    } catch (ex) { setErr(ex.message); }
  }

  const tree = buildTree(comments || []);

  return (
    <div>
      {tree.length === 0 && <p className="muted">Chưa có bình luận. Hãy là người đầu tiên chia sẻ góc nhìn.</p>}
      <div className="list">
        {tree.map((n) => (
          <CommentNode key={n.id} node={n} targetType={targetType} targetId={targetId} onReply={startReply} onChanged={onChanged} depth={0} />
        ))}
      </div>
      {!hideForm && (user ? (
        <form className="card" style={{ marginTop: 12 }} onSubmit={submit}>
          <label htmlFor={`comment-box-${targetType}-${targetId}`}>
            {replyTo ? <>Trả lời {replyTo.author_name}</> : 'Bình luận của bạn'}
          </label>
          {replyTo && (
            <p className="helper">Đang trả lời <span className="mention">@{replyTo.author_name}</span> <button type="button" className="btn btn-ghost" style={{ padding: '2px 10px', fontSize: 12 }} onClick={() => { setReplyTo(null); setDraft(''); }}>Hủy</button></p>
          )}
          <MentionTextarea
            id={`comment-box-${targetType}-${targetId}`} rows={3} value={draft}
            onChange={(e) => setDraft(e.target.value)} maxLength={5000}
            placeholder="Viết lịch sự, đúng trọng tâm. Gõ @ để tag tên ai đó" />
          {err && <p className="field-err">{err}</p>}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btn-primary" type="submit" disabled={!draft.trim()}>Gửi bình luận</button>
          </div>
        </form>
      ) : (
        <p className="notice" style={{ marginTop: 12 }}><Link to="/login">Đăng nhập</Link> để bình luận và trả lời.</p>
      ))}
    </div>
  );
}
