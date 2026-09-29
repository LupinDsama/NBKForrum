import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <span><strong>NBK Forum</strong> Cong dong hoi dap va confession kiem duyet.</span>
        <nav aria-label="Lien ket phu">
          <Link to="/forum">Forum</Link>
          <Link to="/confession">Confession</Link>
          <Link to="/login">Dang nhap</Link>
        </nav>
      </div>
    </footer>
  );
}
