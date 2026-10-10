import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import styles from './Navbar.module.css';

// Top navbar: authenticated BASIC variant (Home, Menu, Cart, Orders, Logout)
// plus a guest-facing variant (Home, Menu, Login, Sign Up) shown only on the
// public Home/Menu routes when the visitor is unauthenticated. Rendered
// exclusively inside BasicLayout, so it never appears on CHEF / DELIVERY /
// Admin / Login / Register / password-recovery pages.
export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const linkClass = ({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link);

  if (!isAuthenticated) {
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
          </nav>
          <div className={styles.guestActions}>
            <NavLink to="/login" className={styles.loginSolid}>
              Log In
            </NavLink>
            <NavLink to="/register" className={styles.signupOutline}>
              Sign Up
            </NavLink>
          </div>
        </div>
      </header>
    );
  }

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
          Log Out
        </button>
      </div>
    </header>
  );
}
