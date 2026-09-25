import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';

// BASIC pages only: Home, Menu, Product Details, Cart, Delivery Address, Orders.
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

// Plain layout for unauthenticated + CHEF + DELIVERY + Admin areas.
// Intentionally does NOT include the BASIC navbar.
export function PlainLayout() {
  return (
    <main>
      <Outlet />
    </main>
  );
}
