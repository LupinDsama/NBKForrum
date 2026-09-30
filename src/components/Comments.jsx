import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChatCircle } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, timeAgo } from '../api/client.js';
import { Avatar } from './ui.jsx';
import Reactions from './Reactions.jsx';

// Render @mentions as highlighted tokens. Content stays plain text.
export function MentionText({ text }) {
  const parts = String(text || '').split(/(@[^\s@]{1,50})/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('@') && p.length > 1
          ? <span key={i} className="mention">{p}</span>
          : <span key={i}>{p}</span>,
      )}
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

function CommentNode({ node, targetType, targetId, onReply, depth }) {
  return (
    <div className={depth > 0 ? 'reply-indent' : undefined}>
      <div className="card card-flat">
        <div className="meta"><Avatar name={node.author_name} /><span>{node.author_name}</span><span>{timeAgo(node.created_at)}</span></div>
        <p style={{ margin: '8px 0' }}><MentionText text={node.content} /></p>
        <div className="row">
          <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => onReply(node)}>
            <ChatCircle size={15} weight="regular" />Tra loi
          </button>
          <Reactions targetType="comment" targetId={node.id} />
        </div>
      </div>
      {node.replies.length > 0 && (
        <div className="list" style={{ marginTop: 8 }}>
          {node.replies.map((r) => (
            <CommentNode key={r.id} node={r} targetType={targetType} targetId={targetId} onReply={onReply} depth={depth + 1} />
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
      {tree.length === 0 && <p className="muted">Chua co binh luan. Hay la nguoi dau tien chia se goc nhin.</p>}
      <div className="list">
        {tree.map((n) => (
          <CommentNode key={n.id} node={n} targetType={targetType} targetId={targetId} onReply={startReply} depth={0} />
        ))}
      </div>
      {!hideForm && (user ? (
        <form className="card" style={{ marginTop: 12 }} onSubmit={submit}>
          <label htmlFor={`comment-box-${targetType}-${targetId}`}>
            {replyTo ? <>Tra loi {replyTo.author_name}</> : 'Binh luan cua ban'}
          </label>
          {replyTo && (
            <p className="helper">Dang tra loi <span className="mention">@{replyTo.author_name}</span> <button type="button" className="btn btn-ghost" style={{ padding: '2px 10px', fontSize: 12 }} onClick={() => { setReplyTo(null); setDraft(''); }}>Huy</button></p>
          )}
          <textarea
            id={`comment-box-${targetType}-${targetId}`} rows={3} value={draft}
            onChange={(e) => setDraft(e.target.value)} maxLength={5000}
            placeholder="Viet lich su, dung trong tam. Go @ten de tag ai do" />
          {err && <p className="field-err">{err}</p>}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btn-primary" type="submit" disabled={!draft.trim()}>Gui binh luan</button>
          </div>
        </form>
      ) : (
        <p className="notice" style={{ marginTop: 12 }}><Link to="/login">Dang nhap</Link> de binh luan va tra loi.</p>
      ))}
    </div>
  );
}
