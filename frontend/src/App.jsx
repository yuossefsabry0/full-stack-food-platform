import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthLayout, BasicLayout, PlainLayout } from './components/Layouts.jsx';
import { RequireAuth, RequireBasicOrGuest, RequireRole } from './components/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import VerifyOtp from './pages/VerifyOtp.jsx';
import ResetPassword from './pages/ResetPassword.jsx';

import Home from './pages/Home.jsx';
import Menu from './pages/Menu.jsx';
import ProductDetails from './pages/ProductDetails.jsx';
import Cart from './pages/Cart.jsx';
import DeliveryAddress from './pages/DeliveryAddress.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetails from './pages/OrderDetails.jsx';

import ChefRequests from './pages/ChefRequests.jsx';
import ChefHistory from './pages/ChefHistory.jsx';
import DeliveryCurrent from './pages/DeliveryCurrent.jsx';
import DeliveryPrevious from './pages/DeliveryPrevious.jsx';

import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import AdminProducts from './pages/AdminProducts.jsx';
import AdminOrders from './pages/AdminOrders.jsx';
import AdminStaff from './pages/AdminStaff.jsx';
import AdminAnalytics from './pages/AdminAnalytics.jsx';

function RoleIndex() {
  return <Navigate to="/home" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Auth entry pages keep the top bar (no bottom taskbar) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Unauthenticated */}
      <Route element={<PlainLayout />}>
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* Home + Menu + Product details: public browse-only (guest supported), same paths, same navbar shell */}
      <Route element={<RequireBasicOrGuest />}>
        <Route element={<BasicLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/products/:id" element={<ProductDetails />} />
        </Route>
      </Route>

      {/* BASIC-only protected area with the dark-blue top navbar */}
      <Route element={<RequireRole roles={['BASIC']} />}>
        <Route element={<BasicLayout />}>
          <Route path="/cart" element={<Cart />} />
          <Route path="/delivery-address" element={<DeliveryAddress />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetails />} />
        </Route>
      </Route>

      {/* CHEF-only area (no BASIC navbar) */}
      <Route element={<RequireRole roles={['CHEF']} />}>
        <Route element={<PlainLayout />}>
          <Route path="/chef/requests" element={<ChefRequests />} />
          <Route path="/chef/history" element={<ChefHistory />} />
        </Route>
      </Route>

      {/* DELIVERY-only area (no BASIC navbar) */}
      <Route element={<RequireRole roles={['DELIVERY']} />}>
        <Route element={<PlainLayout />}>
          <Route path="/delivery/current" element={<DeliveryCurrent />} />
          <Route path="/delivery/previous" element={<DeliveryPrevious />} />
        </Route>
      </Route>

      {/* ADMIN-only area (dashboard entry grid, no BASIC navbar) */}
      <Route element={<RequireRole roles={['ADMIN']} />}>
        <Route element={<PlainLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/staff" element={<AdminStaff />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
        </Route>
      </Route>

      <Route path="/" element={<RoleIndex />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Re-export guard for tests/docs if needed.
export { RequireAuth };
