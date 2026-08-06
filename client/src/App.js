import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import RequireAdmin from './components/RequireAdmin';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import OrderSuccess from './pages/OrderSuccess';
import OrderCancel from './pages/OrderCancel';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import DeleteAccount from './pages/DeleteAccount';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminOrders from './pages/AdminOrders';
import AdminCustomers from './pages/AdminCustomers';
import AdminChat from './pages/AdminChat';
import AdminEmail from './pages/AdminEmail';
import AdminAccount from './pages/AdminAccount';
import AdminSettings from './pages/AdminSettings';

// Home/Shop/About/FAQ/Contact all live as scrollable sections inside Home
// (see pages/Home.js + sections/) rather than separate routes — the navbar
// links to "/#shop" etc instead. Everything transactional (cart, checkout,
// orders, admin, legal) stays a real route since those need their own URL.
export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/order-cancelled" element={<OrderCancel />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/delete-account" element={<DeleteAccount />} />
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
      <Footer />
    </>
  );
}
