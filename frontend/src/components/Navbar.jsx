import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import styles from './Navbar.module.css';

// BASIC-only top navbar. Rendered exclusively inside BasicLayout, so it can
// never appear on CHEF / DELIVERY / Admin / unauthenticated pages.
export default function Navbar() {
  const { logout } = useAuth();
  const linkClass = ({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link);

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <NavLink to="/home" className={styles.brand}>
          Joo Food
        </NavLink>
        <nav className={styles.links} aria-label="Primary">
          <NavLink to="/home" className={linkClass}>
            Home
          </NavLink>
          <NavLink to="/menu" className={linkClass}>
            Menu
          </NavLink>
          <NavLink to="/cart" className={linkClass}>
            Cart
          </NavLink>
          <NavLink to="/orders" className={linkClass}>
            Orders
          </NavLink>
        </nav>
        <button type="button" className={styles.logout} onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
