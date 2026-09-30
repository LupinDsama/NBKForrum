import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ThumbsUp, SmileyWink, SmileyAngry } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, apiUrl } from '../api/client.js';

const KINDS = [
  { kind: 'like', label: 'Thích', Icon: ThumbsUp },
  { kind: 'haha', label: 'Haha', Icon: SmileyWink },
  { kind: 'angry', label: 'Phẫn nộ', Icon: SmileyAngry },
];

// Compact reaction bar for post / question / answer / confession / comment.
export default function Reactions({ targetType, targetId }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ like: 0, haha: 0, angry: 0 });
  const [mine, setMine] = useState(null);

  useEffect(() => {
    let alive = true;
    api.get(`/api/reactions?target_type=${targetType}&target_id=${targetId}`)
      .then((d) => alive && (setCounts(d.counts || {}), setMine(d.mine ?? null)))
      .catch(() => {});
    return () => { alive = false; };
  }, [targetType, targetId]);

  async function react(kind) {
    if (!user) return;
    const prev = mine;
    const next = prev === kind ? null : kind;
    setMine(next);
    setCounts((c) => ({
      ...c,
      ...(prev ? { [prev]: Math.max(0, (c[prev] || 0) - 1) } : {}),
      ...(next ? { [next]: (c[next] || 0) + 1 } : {}),
    }));
    try {
      if (next) await api.post('/api/reactions', { target_type: targetType, target_id: Number(targetId), kind });
      else await fetch(apiUrl(`/api/reactions?target_type=${targetType}&target_id=${targetId}`), { method: 'DELETE', credentials: 'include' });
    } catch {
      setMine(prev); // rollback on failure
      api.get(`/api/reactions?target_type=${targetType}&target_id=${targetId}`)
        .then((d) => (setCounts(d.counts || {}), setMine(d.mine ?? null)))
        .catch(() => {});
    }
  }

  return (
    <div className="reactions" role="group" aria-label="Cảm xúc">
      {KINDS.map(({ kind, label, Icon }) => (
        <button
          key={kind}
          className="react-btn"
          aria-pressed={mine === kind}
          aria-label={`${label}: ${counts[kind] || 0}`}
          title={user ? label : 'Đăng nhập để thả cảm xúc'}
          onClick={() => react(kind)}
          disabled={!user}
        >
          <Icon size={17} weight={mine === kind ? 'fill' : 'regular'} />{counts[kind] || 0}
        </button>
      ))}
      {!user && <Link to="/login" className="muted" style={{ fontSize: 13 }}>Đăng nhập để biểu cảm</Link>}
    </div>
  );
}
