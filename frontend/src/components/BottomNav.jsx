import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import styles from './BottomNav.module.css';

function Icon({ d }) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const PATHS = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10.5V20h13v-9.5',
  menu: 'M4 6h16M4 12h16M4 18h16',
  cart: 'M3 4h2l2.4 12h11.4l2.2-8H7',
  orders: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4',
  login: 'M10 4h10v16H10M4 12h11M11 8l4 4-4 4',
  signup: 'M12 5v14M5 12h14',
  logout: 'M14 4H4v16h10M10 12h11M18 8l4 4-4 4',
};

// Bottom taskbar: floating pill replacing the previous top bar on BASIC
// pages. Guest variant (Home/Menu/Login/Sign Up) and authenticated BASIC
// variant (Home/Menu/Cart/Orders/Logout) mirror Navbar destinations exactly.
// Rendered only inside BasicLayout, so it never appears on Login / Register /
// Forgot-password pages (those keep the top bar instead).
export default function BottomNav() {
  const { isAuthenticated, logout } = useAuth();
  const linkClass = ({ isActive }) => (isActive ? `${styles.item} ${styles.active}` : styles.item);

  if (!isAuthenticated) {
    return (
      <div className={styles.wrap}>
        <nav className={styles.bar} aria-label="Primary">
          <NavLink to="/home" className={linkClass}>
            <Icon d={PATHS.home} />
            <span>Home</span>
          </NavLink>
          <NavLink to="/menu" className={linkClass}>
            <Icon d={PATHS.menu} />
            <span>Menu</span>
          </NavLink>
          <NavLink to="/login" className={linkClass}>
            <Icon d={PATHS.login} />
            <span>Login</span>
          </NavLink>
          <NavLink to="/register" className={linkClass}>
            <Icon d={PATHS.signup} />
            <span>Sign Up</span>
          </NavLink>
        </nav>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <nav className={styles.bar} aria-label="Primary">
        <NavLink to="/home" className={linkClass}>
          <Icon d={PATHS.home} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/menu" className={linkClass}>
          <Icon d={PATHS.menu} />
          <span>Menu</span>
        </NavLink>
        <NavLink to="/cart" className={linkClass}>
          <Icon d={PATHS.cart} />
          <span>Cart</span>
        </NavLink>
        <NavLink to="/orders" className={linkClass}>
          <Icon d={PATHS.orders} />
          <span>Orders</span>
        </NavLink>
        <button type="button" className={styles.item} onClick={logout} aria-label="Log out">
          <Icon d={PATHS.logout} />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}
