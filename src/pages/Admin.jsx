import { useEffect, useState } from 'react';
import { Check, X, MagnifyingGlass } from '@phosphor-icons/react';
import { api, timeAgo } from '../api/client.js';
import { Avatar, SkeletonList, EmptyState } from '../components/ui.jsx';

export default function Admin() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState(null);
  const [reports, setReports] = useState(null);
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState('');
  const [failed, setFailed] = useState('');

  async function load() {
    try {
      const [s, p, r] = await Promise.all([
        api.get('/api/admin/dashboard'),
        api.get('/api/admin/confessions?status=pending'),
        api.get('/api/admin/reports?status=open'),
      ]);
      setStats(s); setPending(p.items || []); setReports(r.items || []);
    } catch (ex) { setFailed(ex.message); }
  }
  async function loadUsers() {
    const d = await api.get(`/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`).catch(() => ({ items: [] }));
    setUsers(d.items || []);
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="wrap page">
      <h1>Quan tri</h1>
      <p className="muted">Duyet confession, xu ly bao cao va quan ly nguoi dung. Moi tac dong duoc ghi log.</p>
      {failed && <p className="field-err">{failed}</p>}

      <div className="tabs" role="tablist" aria-label="Khu vuc quan tri">
        {['overview', 'confessions', 'reports', 'users'].map((t) => (
          <button key={t} role="tab" className="tab" aria-selected={tab === t} onClick={() => { setTab(t); if (t === 'users') loadUsers(); }}>
            {t === 'overview' ? 'Tong quan' : t === 'confessions' ? `Duyet bai (${pending?.length ?? 0})` : t === 'reports' ? `Bao cao (${reports?.length ?? 0})` : 'Nguoi dung'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        stats ? (
          <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="card"><strong style={{ fontSize: 28 }}>{stats.users}</strong><div className="muted">Nguoi dung</div></div>
            <div className="card"><strong style={{ fontSize: 28 }}>{stats.posts}</strong><div className="muted">Bai viet</div></div>
            <div className="card"><strong style={{ fontSize: 28 }}>{stats.pendingConfessions}</strong><div className="muted">Cho duyet</div></div>
            <div className="card"><strong style={{ fontSize: 28 }}>{stats.openReports}</strong><div className="muted">Bao cao mo</div></div>
          </div>
        ) : <SkeletonList rows={2} />
      )}

      {tab === 'confessions' && (
        pending === null ? <SkeletonList rows={3} /> : pending.length === 0 ? (
          <EmptyState title="Khong con bai cho duyet" hint="Hang doi dang sach. Bai moi se hien o day." />
        ) : (
          <div className="list">
            {pending.map((c) => (
              <div key={c.id} className="card">
                <div className="meta"><Avatar name={c.author_name || c.author_email} /><span>{c.author_name || c.author_email || 'Khach'}</span><span>{timeAgo(c.created_at)}</span></div>
                <p>{c.content}</p>
                <div className="row">
                  <button className="btn btn-primary" onClick={async () => { await api.post(`/api/admin/confessions/${c.id}/approve`, {}); load(); }}>
                    <Check size={16} weight="regular" />Duyet
                  </button>
                  <button className="btn btn-ghost" onClick={async () => {
                    const reason = window.prompt('Ly do tu choi:', 'Noi dung khong phu hop');
                    if (reason === null) return;
                    await api.post(`/api/admin/confessions/${c.id}/reject`, { reason });
                    load();
                  }}>
                    <X size={16} weight="regular" />Tu choi
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'reports' && (
        reports === null ? <SkeletonList rows={3} /> : reports.length === 0 ? (
          <EmptyState title="Khong co bao cao mo" hint="Bao cao tu cong dong se hien o day." />
        ) : (
          <div className="list">
            {reports.map((r) => (
              <div key={r.id} className="card card-flat">
                <div><strong>{r.target_type} #{r.target_id}</strong> Ly do: {r.reason}</div>
                {r.description && <p className="muted">{r.description}</p>}
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={async () => { await api.post(`/api/admin/reports/${r.id}/resolve`, { resolution: 'resolved' }); load(); }}>Danh dau da xu ly</button>
                  <button className="btn btn-ghost" onClick={async () => { await api.post(`/api/admin/reports/${r.id}/resolve`, { resolution: 'dismissed' }); load(); }}>Bo qua</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'users' && (
        <>
          <div className="row">
            <span style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
              <MagnifyingGlass size={17} weight="regular" style={{ position: 'absolute', left: 12, top: 12 }} />
              <input aria-label="Tim nguoi dung" placeholder="Tim theo email hoac ten" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
            </span>
            <button className="btn btn-ghost" onClick={loadUsers}>Tim</button>
          </div>
          {users === null ? <SkeletonList rows={3} /> : (
            <div className="list" style={{ marginTop: 14 }}>
              {users.map((u) => (
                <div key={u.id} className="card card-flat">
                  <div className="row">
                    <Avatar name={u.display_name} />
                    <div><strong>{u.display_name}</strong><div className="meta"><span>{u.email}</span><span>{u.role}</span><span>{u.status}</span></div></div>
                  </div>
                  <div className="row" style={{ marginTop: 10 }}>
                    <button className="btn btn-ghost" onClick={async () => { await api.post(`/api/admin/users/${u.id}/${u.status === 'banned' ? 'unban' : 'ban'}`, {}); loadUsers(); }}>
                      {u.status === 'banned' ? 'Mo khoa' : 'Khoa'}
                    </button>
                    <button className="btn btn-ghost" onClick={async () => { await api.post(`/api/admin/users/${u.id}/role`, { role: u.role === 'admin' ? 'user' : 'admin' }); loadUsers(); }}>
                      {u.role === 'admin' ? 'Ha quyen user' : 'Len admin'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
