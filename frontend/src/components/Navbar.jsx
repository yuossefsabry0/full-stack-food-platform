import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';
import styles from './Navbar.module.css';

function NavIcon({ d }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  cart: 'M3 4h2l2.4 12h11.4l2.2-8H7',
  orders: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4',
  logout: 'M14 4H4v16h10M10 12h11M18 8l4 4-4 4',
};

// Top taskbar (white bar, site name on the left).
// Guest variant: Menu / Cart / Orders icon links + Log In / Sign Up buttons
// (Cart/Orders are BASIC-guarded and redirect unauthenticated visitors to
// login — no guard logic changed here).
// Authenticated BASIC variant: same links + user dropdown (avatar with the
// logged-in user's name, My orders, Log out). Only profile-adjacent entries
// backed by real routes are offered (no fake profile/addresses pages).
// Rendered only inside BasicLayout (shop pages) and AuthLayout (login /
// register / forgot-password) — never on CHEF / DELIVERY / Admin pages.
export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const linkClass = ({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link);
  const displayName = user?.name || user?.username || 'Account';
  const initial = String(displayName).trim().charAt(0).toUpperCase() || '?';

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  async function onLogout() {
    setOpen(false);
    await logout();
  }

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <NavLink to="/home" className={styles.brand} aria-label="Joo Food home">
          <span className={styles.logoMark} aria-hidden="true">
            J
          </span>
          Joo food
        </NavLink>
        <nav className={styles.links} aria-label="Primary">
          <NavLink to="/menu" className={linkClass}>
            <NavIcon d={ICONS.menu} />
            <span>Menu</span>
          </NavLink>
          <NavLink to="/cart" className={linkClass}>
            <NavIcon d={ICONS.cart} />
            <span>Cart</span>
          </NavLink>
          <NavLink to="/orders" className={linkClass}>
            <NavIcon d={ICONS.orders} />
            <span>Orders</span>
          </NavLink>
        </nav>
        <NotificationBell />
        {!isAuthenticated ? (
          <div className={styles.guestActions}>
            <NavLink to="/login" className={styles.loginSolid}>
              Log In
            </NavLink>
            <NavLink to="/register" className={styles.signupOutline}>
              Sign up
            </NavLink>
          </div>
        ) : (
          <div className={styles.userWrap} ref={wrapRef}>
            <button
              type="button"
              className={styles.avatarBtn}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label={`Account menu for ${displayName}`}
              onClick={() => setOpen((v) => !v)}
            >
              <span className={styles.avatar} aria-hidden="true">
                {initial}
              </span>
              <span className={styles.avatarName}>{displayName}</span>
              <span className={styles.avatarCaret} aria-hidden="true">
                ▾
              </span>
            </button>
            {open && (
              <div className={styles.dropdown} role="menu" aria-label="Account">
                <div className={styles.dropHead}>
                  <span className={styles.dropName}>{displayName}</span>
                  <span className={styles.dropSub}>{user?.role === 'BASIC' ? 'Customer account' : user?.role || ''}</span>
                </div>
                <Link className={styles.dropItem} role="menuitem" to="/orders" onClick={() => setOpen(false)}>
                  <NavIcon d={ICONS.orders} />
                  <span>My orders</span>
                </Link>
                <button className={`${styles.dropItem} ${styles.dropDanger}`} role="menuitem" type="button" onClick={onLogout}>
                  <NavIcon d={ICONS.logout} />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
