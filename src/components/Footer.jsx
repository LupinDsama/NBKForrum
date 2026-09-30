import { Link, useNavigate } from 'react-router-dom';
import { SignOut } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Footer() {
  const { user, logout, isAdmin } = useAuth();
  const nav = useNavigate();

  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <span><strong>NBK Forum</strong> Cong dong hoi dap va confession kiem duyet.</span>
        <nav aria-label="Lien ket phu">
          <Link to="/forum">Forum</Link>
          <Link to="/confession">Confession</Link>
          {isAdmin && <Link to="/admin">Admin</Link>}
          {user ? (
            <>
              <span className="muted">Xin chao, {user.displayName}</span>
              <button
                className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }}
                onClick={async () => { await logout(); nav('/'); }}
              >
                <SignOut size={15} weight="regular" />Dang xuat
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Dang nhap</Link>
              <Link to="/register">Dang ky</Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  );
}
