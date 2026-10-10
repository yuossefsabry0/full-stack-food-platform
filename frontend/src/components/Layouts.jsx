import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';

// BASIC pages only: Home, Menu, Product Details, Cart, Delivery Address, Orders.
// Navigation lives in the top bar (Navbar, site name on the left), as originally.
// (BottomNav.jsx remains in the tree but is not rendered.)
export function BasicLayout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </>
  );
}

// Auth entry pages only: Login, Register, Forgot password.
// These keep the top bar and never show the bottom taskbar.
export function AuthLayout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </>
  );
}

// Plain layout for unauthenticated + CHEF + DELIVERY + Admin areas.
// Intentionally does NOT include the BASIC navbar.
export function PlainLayout() {
  return (
    <main>
      <Outlet />
    </main>
  );
}
