import { logout } from './login/actions';
import './admin-header.css';

export default function AdminHeader({
  active,
}: {
  active: 'products' | 'traffic';
}) {
  return (
    <header className="radas-admin-header">
      <a className="radas-admin-brand" href="/admin">
        RADAS <span>ADMIN</span>
      </a>

      <nav className="radas-admin-nav" aria-label="Admin">
        <a
          href="/admin"
          aria-current={active === 'products' ? 'page' : undefined}
        >
          Urus Produk
        </a>
        <a
          href="/admin/traffic"
          aria-current={active === 'traffic' ? 'page' : undefined}
        >
          Statistik Trafik
        </a>
      </nav>

      <form action={logout} className="radas-admin-logout">
        <button type="submit">Log Keluar</button>
      </form>
    </header>
  );
}