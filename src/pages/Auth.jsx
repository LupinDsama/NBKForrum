import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EnvelopeSimple, Key, User } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';

function Shell({ title, children }) {
  return (
    <div className="wrap page" style={{ maxWidth: 560 }}>
      <h1>{title}</h1>
      <div className="card">{children}</div>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Shell title="Đăng nhập">
      <form onSubmit={async (e) => {
        e.preventDefault(); setErr(''); setBusy(true);
        try { await login(email.trim(), password); nav('/'); }
        catch (ex) { setErr(ex.message); } finally { setBusy(false); }
      }}>
        <label htmlFor="le"><EnvelopeSimple size={15} weight="regular" style={{ verticalAlign: -2 }} /> Gmail</label>
        <input id="le" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="bạn@gmail.com" />
        <label htmlFor="lp"><Key size={15} weight="regular" style={{ verticalAlign: -2 }} /> Mật khẩu</label>
        <input id="lp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Tối thiểu 8 ký tự" />
        {err && <p className="field-err">{err}</p>}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary" type="submit" disabled={busy || !email.trim() || !password}>{busy ? 'Đăng nhập' : 'Đăng nhập'}</button>
          <Link to="/register">Chưa có tài khoản</Link>
        </div>
      </form>
    </Shell>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Shell title="Đăng ký">
      <form onSubmit={async (e) => {
        e.preventDefault(); setErr(''); setBusy(true);
        try { await register(email.trim(), password, displayName.trim()); nav('/'); }
        catch (ex) { setErr(ex.message); } finally { setBusy(false); }
      }}>
        <label htmlFor="re"><EnvelopeSimple size={15} weight="regular" style={{ verticalAlign: -2 }} /> Gmail</label>
        <input id="re" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="bạn@gmail.com" />
        <p className="helper">Dùng Gmail that để nhận thông báo kiểm duyệt.</p>
        <label htmlFor="rn"><User size={15} weight="regular" style={{ verticalAlign: -2 }} /> Tên hiển thị</label>
        <input id="rn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} placeholder="Ví dụ: Minh Anh" />
        <label htmlFor="rp"><Key size={15} weight="regular" style={{ verticalAlign: -2 }} /> Mật khẩu</label>
        <input id="rp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" />
        <p className="helper">Mật khẩu được hash trên server, không lưu dạng text.</p>
        {err && <p className="field-err">{err}</p>}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary" type="submit" disabled={busy || !email.trim() || password.length < 8 || !displayName.trim()}>Tạo tài khoản</button>
          <Link to="/login">Đã có tài khoản</Link>
        </div>
      </form>
    </Shell>
  );
}
