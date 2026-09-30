import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Trash, Checks } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, apiUrl, timeAgo } from '../api/client.js';

export default function NotifBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);

  async function load() {
    if (!user) { setItems([]); return; }
    try {
      const d = await api.get('/api/notifications');
      setItems(d.items || []);
    } catch {
      setItems([]);
    }
  }
  useEffect(() => { load(); }, [user]);
  useEffect(() => {
    if (!user) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [user]);

  if (!user) return null;
  const unread = items.filter((n) => !n.is_read).length;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      await load();
      if (items.some((n) => !n.is_read)) {
        await fetch(apiUrl('/api/notifications/read-all'), { method: 'POST', credentials: 'include' }).catch(() => {});
        load();
      }
    }
  }

  async function remove(id) {
    await api.delete(`/api/notifications/${id}`).catch(() => {});
    setItems((list) => list.filter((n) => n.id !== id));
  }

  async function clearAll() {
    if (!window.confirm('Xóa tất cả thông báo?')) return;
    await fetch(apiUrl('/api/notifications'), { method: 'DELETE', credentials: 'include' }).catch(() => {});
    setItems([]);
  }

  function targetLink(n) {
    if (n.target_type === 'post') return `/posts/${n.target_id}`;
    if (n.target_type === 'question') return `/forum`;
    if (n.target_type === 'confession') return '/confession';
    return '/';
  }

  return (
    <span style={{ position: 'relative' }}>
      <button className="icon-btn" aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ''}`} aria-expanded={open} onClick={toggle}>
        <Bell size={18} weight={unread ? 'fill' : 'regular'} />
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <span className="notif-pop" role="dialog" aria-label="Thông báo của bạn">
          <span className="notif-head">
            <strong>Thông báo</strong>
            <span className="row" style={{ gap: 4 }}>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={async () => {
                await fetch(apiUrl('/api/notifications/read-all'), { method: 'POST', credentials: 'include' }).catch(() => {});
                load();
              }}>
                <Checks size={14} weight="regular" />Đã đọc
              </button>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={clearAll}>
                <Trash size={14} weight="regular" />Xóa hết
              </button>
            </span>
          </span>
          {items.length === 0 && <p className="muted" style={{ margin: '8px 4px' }}>Chưa có thông báo nào.</p>}
          {items.map((n) => (
            <span key={n.id} className={`notif-item${n.is_read ? '' : ' unread'}`}>
              <span style={{ flex: 1 }}>
                <Link to={targetLink(n)} onClick={() => setOpen(false)}><strong>{n.title}</strong></Link>
                <span className="muted" style={{ display: 'block', fontSize: 13 }}>{n.message}</span>
                <span className="muted" style={{ fontSize: 12 }}>{timeAgo(n.created_at)}</span>
              </span>
              <button className="icon-btn" style={{ width: 30, height: 30 }} aria-label="Xóa thông báo này" onClick={() => remove(n.id)}>
                <Trash size={15} weight="regular" />
              </button>
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
