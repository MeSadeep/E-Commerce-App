import React, { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import {
  LayoutDashboard, Package, ShoppingCart, Users, MessageSquare, Mail,
  UserCircle, Settings, LogOut, Search, SlidersHorizontal, ChevronsLeft, Store,
} from 'lucide-react';
import ApertureMark from './ApertureMark';
import { useCart } from '../context/CartContext';

const mainItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/customers', label: 'Customers', icon: Users },
];

// Chat and Email aren't backed by any real messaging system in this
// project — they're included because the requested layout calls for them,
// but each links to a page that says so plainly instead of faking data.
const otherItems = [
  { to: '/admin/chat', label: 'Chat', icon: MessageSquare },
  { to: '/admin/email', label: 'Email', icon: Mail },
];

const accountItems = [
  { to: '/admin/account', label: 'Account', icon: UserCircle },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

const linkCls = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
    isActive ? 'bg-ink text-white font-medium' : 'text-ink/60 hover:bg-accent-50'
  }`;

export default function AdminLayout() {
  const { user, logout } = useAuth0();
  const { clearCart } = useCart();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');

  const handleLogout = () => {
    clearCart();
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    // Filters the product table on the Products page. Other admin sections
    // (orders/customers) don't have search wired in yet.
    navigate(`/admin/products?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="min-h-screen bg-paper flex">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-20' : 'w-64'} shrink-0 bg-white border-r border-line flex flex-col transition-all duration-200`}>
        <div className="flex items-center justify-between px-4 py-5">
          <Link to="/" className="flex items-center gap-2 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-ink flex items-center justify-center shrink-0">
              <ApertureMark size={20} color="#67E8F9" />
            </div>
            {!collapsed && (
              <div>
                <div className="font-display font-bold text-sm leading-tight">Aperture Inc.</div>
                <div className="text-xs text-ink/40">Admin console</div>
              </div>
            )}
          </Link>
          <button onClick={() => setCollapsed((c) => !c)} className="text-ink/40 hover:text-ink">
            <ChevronsLeft size={18} className={collapsed ? 'rotate-180' : ''} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-6 overflow-y-auto">
          <div>
            {!collapsed && <p className="text-[11px] font-medium text-ink/35 uppercase tracking-wide px-3 mb-2">Main menu</p>}
            <div className="space-y-1">
              {mainItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={linkCls}>
                  <Icon size={18} />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </div>
          </div>

          <div>
            {!collapsed && <p className="text-[11px] font-medium text-ink/35 uppercase tracking-wide px-3 mb-2">Other</p>}
            <div className="space-y-1">
              {otherItems.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={linkCls}>
                  <Icon size={18} />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </div>
          </div>

          <div>
            {!collapsed && <p className="text-[11px] font-medium text-ink/35 uppercase tracking-wide px-3 mb-2">Account</p>}
            <div className="space-y-1">
              {accountItems.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={linkCls}>
                  <Icon size={18} />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        <div className="px-3 pb-3">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-ink/60 hover:bg-accent-50 transition-colors">
            <Store size={18} />
            {!collapsed && <span>Back to store</span>}
          </Link>
        </div>

        <div className="p-3 border-t border-line">
          <div className="flex items-center gap-3 px-2 py-2">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent-100 shrink-0" />
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user?.name || 'Admin'}</div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-ink/40 hover:text-red-600 shrink-0"
              aria-label="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-line px-6 py-4 flex items-center gap-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-line text-sm focus:outline-none focus:border-accent-500"
            />
          </form>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-line text-sm text-ink/60 hover:bg-accent-50"
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
        </header>

        <main className="flex-1 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
