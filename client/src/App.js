import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import RequireAdmin from './components/RequireAdmin';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import OrderSuccess from './pages/OrderSuccess';
import OrderCancel from './pages/OrderCancel';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import DeleteAccount from './pages/DeleteAccount';
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminOrders from './pages/AdminOrders';
import AdminCustomers from './pages/AdminCustomers';
import AdminChat from './pages/AdminChat';
import AdminEmail from './pages/AdminEmail';
import AdminAccount from './pages/AdminAccount';
import AdminSettings from './pages/AdminSettings';

// Public storefront pages keep the marketing navbar + footer.
function StorefrontLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  );
}

// The admin console is a separate app shell (sidebar + topbar), not the
// storefront nav — matches how real admin dashboards are usually laid out,
// and keeps "browsing the shop" and "managing the shop" visually distinct.
export default function App() {
  return (
    <Routes>
      <Route element={<StorefrontLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/order-cancelled" element={<OrderCancel />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/delete-account" element={<DeleteAccount />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="chat" element={<AdminChat />} />
        <Route path="email" element={<AdminEmail />} />
        <Route path="account" element={<AdminAccount />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  );
}
