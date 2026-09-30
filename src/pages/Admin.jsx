import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, MagnifyingGlass, Trash, ChatCircle } from '@phosphor-icons/react';
import { api, timeAgo } from '../api/client.js';
import { Avatar, SkeletonList, EmptyState } from '../components/ui.jsx';
import CommentThread from '../components/Comments.jsx';
import MentionTextarea from '../components/MentionTextarea.jsx';
import { MentionText } from '../components/Comments.jsx';

function ApprovedConfession({ c, onChanged }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [draft, setDraft] = useState('');

  async function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (!detail) {
      try { setDetail(await api.get(`/api/confessions/${c.id}`)); }
      catch { setDetail({ comments: [] }); }
    }
  }

  async function comment(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    await api.post('/api/comments', { target_type: 'confession', target_id: c.id, content: draft.trim() });
    setDraft('');
    setDetail(await api.get(`/api/confessions/${c.id}`).catch(() => detail));
  }

  async function remove() {
    if (!window.confirm(`Xóa confession #${c.id} vĩnh viễn?`)) return;
    await api.post(`/api/admin/confessions/${c.id}/delete`, {});
    onChanged();
  }

  return (
    <div className="card">
      <div className="meta"><span>#{c.id}</span><span>{c.author_name || c.author_email || 'Khach'}</span><span>{timeAgo(c.created_at)}</span></div>
      <p><MentionText text={c.content} /></p>
      <div className="row">
        <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={toggle}>
          <ChatCircle size={15} weight="regular" />Bình luận với tư cách admin
        </button>
        <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={remove}>
          <Trash size={15} weight="regular" />Xóa bài
        </button>
      </div>
      {open && (
        <div style={{ marginTop: 12 }}>
          {!detail ? <SkeletonList rows={2} /> : (
            <>
              <CommentThread targetType="confession" targetId={c.id} comments={detail.comments || []} onChanged={async () => {
                setDetail(await api.get(`/api/confessions/${c.id}`).catch(() => detail));
              }} hideForm />
              <form className="card card-flat" style={{ marginTop: 8 }} onSubmit={comment}>
                <label htmlFor={`ac-${c.id}`}>Bình luận (hiện tên admin, không ẩn danh)</label>
                <MentionTextarea id={`ac-${c.id}`} rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={5000} />
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn btn-primary" type="submit" disabled={!draft.trim()}>Gửi</button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState(null);
  const [approved, setApproved] = useState(null);
  const [reports, setReports] = useState(null);
  const [posts, setPosts] = useState(null);
  const [questionsAdmin, setQuestionsAdmin] = useState(null);
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState('');
  const [failed, setFailed] = useState('');

  async function load() {
    try {
      const [s, p, a, r, ps, qs] = await Promise.all([
        api.get('/api/admin/dashboard'),
        api.get('/api/admin/confessions?status=pending'),
        api.get('/api/admin/confessions?status=approved'),
        api.get('/api/admin/reports?status=open'),
        api.get('/api/admin/posts'),
        api.get('/api/admin/questions'),
      ]);
      setStats(s); setPending(p.items || []); setApproved(a.items || []);
      setReports(r.items || []); setPosts(ps.items || []); setQuestionsAdmin(qs.items || []);
    } catch (ex) { setFailed(ex.message); }
  }
  async function loadUsers() {
    const d = await api.get(`/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`).catch(() => ({ items: [] }));
    setUsers(d.items || []);
  }
  useEffect(() => { load(); }, []);

  const tabs = [
    ['overview', 'Tổng quan'],
    ['confessions', `Duyệt bài (${pending?.length ?? 0})`],
    ['approved', `Đã duyệt (${approved?.length ?? 0})`],
    ['posts', `Bài viết (${posts?.length ?? 0})`],
    ['questions', `Hỏi đáp (${questionsAdmin?.length ?? 0})`],
    ['reports', `Báo cáo (${reports?.length ?? 0})`],
    ['users', 'Người dùng'],
  ];

  return (
    <div className="wrap page">
      <h1>Quản trị</h1>
      <p className="muted">Duyệt confession, xóa bài vi phạm, xử lý báo cáo và quản lý người dùng. Mọi tác động được ghi log.</p>
      {failed && <p className="field-err">{failed}</p>}

      <div className="tabs" role="tablist" aria-label="Khu vực quản trị">
        {tabs.map(([t, label]) => (
          <button key={t} role="tab" className="tab" aria-selected={tab === t} onClick={() => { setTab(t); if (t === 'users') loadUsers(); }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        stats ? (
          <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="card"><strong style={{ fontSize: 28 }}>{stats.users}</strong><div className="muted">Người dùng</div></div>
            <div className="card"><strong style={{ fontSize: 28 }}>{stats.posts}</strong><div className="muted">Bài viết</div></div>
            <div className="card"><strong style={{ fontSize: 28 }}>{stats.pendingConfessions}</strong><div className="muted">Chờ duyệt</div></div>
            <div className="card"><strong style={{ fontSize: 28 }}>{stats.openReports}</strong><div className="muted">Báo cáo mở</div></div>
          </div>
        ) : <SkeletonList rows={2} />
      )}

      {tab === 'confessions' && (
        pending === null ? <SkeletonList rows={3} /> : pending.length === 0 ? (
          <EmptyState title="Không còn bài chờ duyệt" hint="Hàng đợi đang trống. Bài mới sẽ hiện ở đây." />
        ) : (
          <div className="list">
            {pending.map((c) => (
              <div key={c.id} className="card">
                <div className="meta"><Avatar name={c.author_name || c.author_email} /><span>{c.author_name || c.author_email || 'Khach'}</span><span>{timeAgo(c.created_at)}</span></div>
                <p>{c.content}</p>
                <div className="row">
                  <button className="btn btn-primary" onClick={async () => {
                    await api.post(`/api/admin/confessions/${c.id}/approve`, {});
                    load();
                  }}>
                    <Check size={16} weight="regular" />Duyệt
                  </button>
                  <button className="btn btn-ghost" onClick={async () => {
                    const reason = window.prompt('Lý do từ chơi:', 'Nội dung không phù hợp');
                    if (reason === null) return;
                    await api.post(`/api/admin/confessions/${c.id}/reject`, { reason });
                    load();
                  }}>
                    <X size={16} weight="regular" />Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'approved' && (
        approved === null ? <SkeletonList rows={3} /> : approved.length === 0 ? (
          <EmptyState title="Chưa có bài đã duyệt" hint="Bài được duyệt sẽ hiện ở đây để tiếp tục kiểm soát." />
        ) : (
          <div className="list">
            {approved.map((c) => (
              <ApprovedConfession key={c.id} c={c} onChanged={load} />
            ))}
          </div>
        )
      )}

      {tab === 'posts' && (
        posts === null ? <SkeletonList rows={3} /> : posts.length === 0 ? (
          <EmptyState title="Chưa có bài viết" hint="Bài viết của người dùng sẽ hiện ở đây." />
        ) : (
          <div className="list">
            {posts.map((p) => (
              <div key={p.id} className="card card-flat">
                <div className="row">
                  <Avatar name={p.author_name} />
                  <div>
                    <Link to={`/posts/${p.id}`} className="post-title">{p.title}</Link>
                    <div className="meta"><span>{p.author_name}</span><span>{timeAgo(p.created_at)}</span><span>{p.views} lượt xem</span></div>
                  </div>
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={async () => {
                    if (!window.confirm(`Xóa bài "${p.title}"?`)) return;
                    await api.post(`/api/admin/posts/${p.id}/delete`, {});
                    load();
                  }}>
                    <Trash size={15} weight="regular" />Xóa bài
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'questions' && (
        questionsAdmin === null ? <SkeletonList rows={3} /> : questionsAdmin.length === 0 ? (
          <EmptyState title="Chưa có câu hỏi" hint="Câu hỏi của người dùng sẽ hiện ở đây." />
        ) : (
          <div className="list">
            {questionsAdmin.map((item) => (
              <div key={item.id} className="card card-flat">
                <div className="row">
                  <Avatar name={item.author_name} />
                  <div>
                    <Link to={`/questions/${item.id}`} className="post-title">{item.title}</Link>
                    <div className="meta"><span>{item.author_name}</span><span>{timeAgo(item.created_at)}</span><span>{item.status}</span></div>
                  </div>
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={async () => {
                    if (!window.confirm(`Xóa câu hỏi "${item.title}"?`)) return;
                    await api.post(`/api/admin/questions/${item.id}/delete`, {});
                    load();
                  }}>
                    <Trash size={15} weight="regular" />Xóa bài
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'reports' && (
        reports === null ? <SkeletonList rows={3} /> : reports.length === 0 ? (
          <EmptyState title="Không có báo cáo mở" hint="Báo cáo từ cộng đồng sẽ hiện ở đây." />
        ) : (
          <div className="list">
            {reports.map((r) => (
              <div key={r.id} className="card card-flat">
                <div><strong>{r.target_type} #{r.target_id}</strong> Lý do: {r.reason}</div>
                {r.description && <p className="muted">{r.description}</p>}
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={async () => { await api.post(`/api/admin/reports/${r.id}/resolve`, { resolution: 'resolved' }); load(); }}>Đánh dấu đã xử lý</button>
                  <button className="btn btn-ghost" onClick={async () => { await api.post(`/api/admin/reports/${r.id}/resolve`, { resolution: 'dismissed' }); load(); }}>Bỏ qua</button>
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
              <input aria-label="Tìm người dùng" placeholder="Tìm theo email hoặc tên" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
            </span>
            <button className="btn btn-ghost" onClick={loadUsers}>Tìm</button>
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
                      {u.status === 'banned' ? 'Mở khóa' : 'Khóa'}
                    </button>
                    <button className="btn btn-ghost" onClick={async () => { await api.post(`/api/admin/users/${u.id}/role`, { role: u.role === 'admin' ? 'user' : 'admin' }); loadUsers(); }}>
                      {u.role === 'admin' ? 'Hạ quyền user' : 'Lên admin'}
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
