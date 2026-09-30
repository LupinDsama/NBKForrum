import { Link, useNavigate } from 'react-router-dom';
import { SignOut } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Footer() {
  const { user, logout, isAdmin } = useAuth();
  const nav = useNavigate();

  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <span><strong>NBK Forum</strong> Cộng đồng hoi dap và confession kiểm duyệt.</span>
        <nav aria-label="Liên kết phụ">
          <Link to="/forum">Forum</Link>
          <Link to="/confession">Confession</Link>
          {isAdmin && <Link to="/admin">Admin</Link>}
          {user ? (
            <>
              <span className="muted">Xin chào, {user.displayName}</span>
              <button
                className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }}
                onClick={async () => { await logout(); nav('/'); }}
              >
                <SignOut size={15} weight="regular" />Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Đăng nhập</Link>
              <Link to="/register">Đăng ký</Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  );
}
