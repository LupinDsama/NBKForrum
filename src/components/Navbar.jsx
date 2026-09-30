import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { List, Sun, Moon, SignOut, UserCircle } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar({ theme, onTheme }) {
  const { user, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  async function onLogout() {
    await logout();
    setOpen(false);
    nav('/');
  }

  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">N</span>NBK Forum
        </Link>
        <button
          className="icon-btn menu-btn" aria-label="Mo menu" aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <List size={20} weight="regular" />
        </button>
        {!user && (
          <span className="mobile-auth">
            <Link to="/login" onClick={() => setOpen(false)}>Dang nhap</Link>
            <Link to="/register" className="btn btn-primary" style={{ padding: '7px 16px', fontSize: 13.5 }} onClick={() => setOpen(false)}>Dang ky</Link>
          </span>
        )}
        <nav className={`nav-links${open ? ' open' : ''}`} aria-label="Dieu huong chinh">
          <NavLink to="/forum" onClick={() => setOpen(false)}>Forum</NavLink>
          <NavLink to="/confession" onClick={() => setOpen(false)}>Confession</NavLink>
          {isAdmin && <NavLink to="/admin" onClick={() => setOpen(false)}>Admin</NavLink>}
          {user ? (
            <>
              <span className="meta"><UserCircle size={18} weight="regular" />{user.displayName}</span>
              <button className="btn btn-ghost" onClick={onLogout}>
                <SignOut size={17} weight="regular" />Dang xuat
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={() => setOpen(false)}>Dang nhap</NavLink>
              <NavLink to="/register" className="btn btn-primary" onClick={() => setOpen(false)}>Dang ky</NavLink>
            </>
          )}
          <button className="icon-btn" aria-label="Doi giao dien" onClick={onTheme}>
            {theme === 'dark' ? <Sun size={18} weight="regular" /> : <Moon size={18} weight="regular" />}
          </button>
        </nav>
      </div>
    </header>
  );
}
