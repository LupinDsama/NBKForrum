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
    <Shell title="Dang nhap">
      <form onSubmit={async (e) => {
        e.preventDefault(); setErr(''); setBusy(true);
        try { await login(email.trim(), password); nav('/'); }
        catch (ex) { setErr(ex.message); } finally { setBusy(false); }
      }}>
        <label htmlFor="le"><EnvelopeSimple size={15} weight="regular" style={{ verticalAlign: -2 }} /> Gmail</label>
        <input id="le" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="ban@gmail.com" />
        <label htmlFor="lp"><Key size={15} weight="regular" style={{ verticalAlign: -2 }} /> Mat khau</label>
        <input id="lp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Toi thieu 8 ky tu" />
        {err && <p className="field-err">{err}</p>}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary" type="submit" disabled={busy || !email.trim() || !password}>{busy ? 'Dang nhap' : 'Dang nhap'}</button>
          <Link to="/register">Chua co tai khoan</Link>
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
    <Shell title="Dang ky">
      <form onSubmit={async (e) => {
        e.preventDefault(); setErr(''); setBusy(true);
        try { await register(email.trim(), password, displayName.trim()); nav('/'); }
        catch (ex) { setErr(ex.message); } finally { setBusy(false); }
      }}>
        <label htmlFor="re"><EnvelopeSimple size={15} weight="regular" style={{ verticalAlign: -2 }} /> Gmail</label>
        <input id="re" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="ban@gmail.com" />
        <p className="helper">Dung Gmail that de nhan thong bao kiem duyet.</p>
        <label htmlFor="rn"><User size={15} weight="regular" style={{ verticalAlign: -2 }} /> Ten hien thi</label>
        <input id="rn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} placeholder="Vi du: Minh Anh" />
        <label htmlFor="rp"><Key size={15} weight="regular" style={{ verticalAlign: -2 }} /> Mat khau</label>
        <input id="rp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="Toi thieu 8 ky tu" />
        <p className="helper">Mat khau duoc hash tren server, khong luu dang text.</p>
        {err && <p className="field-err">{err}</p>}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary" type="submit" disabled={busy || !email.trim() || password.length < 8 || !displayName.trim()}>Tao tai khoan</button>
          <Link to="/login">Da co tai khoan</Link>
        </div>
      </form>
    </Shell>
  );
}
