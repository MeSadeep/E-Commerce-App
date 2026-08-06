import React, { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Search, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import ApertureMark from './ApertureMark';
import MagneticDock from './MagneticDock';

const ROLE_CLAIM = 'https://aperturegoods.com/roles';

const navLink = ({ isActive }) =>
  `px-4 py-2 rounded-full text-sm font-body transition-colors ${
    isActive ? 'bg-accent-500 text-ink font-medium' : 'text-white/70 hover:text-white'
  }`;

const sectionLinkCls = 'px-4 py-2 rounded-full text-sm font-body text-white/70 hover:text-white transition-colors';

export default function Navbar() {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0();
  const { items, clearCart } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const isAdmin = (user?.[ROLE_CLAIM] || []).map((r) => r.trim()).includes('admin');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    clearCart();
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/?q=${encodeURIComponent(searchValue.trim())}#shop`);
    } else {
      navigate('/#shop');
    }
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-4 z-30 mx-4 md:mx-8">
      <div
        className={`mx-auto max-w-6xl rounded-full flex items-center justify-between px-4 py-2 shadow-lg shadow-ink/10 transition-colors ${
          scrolled ? 'bg-ink/90 backdrop-blur-md' : 'bg-ink'
        }`}
      >
        <Link to="/#home" className="flex items-center gap-2 pl-1 pr-3 shrink-0">
          <ApertureMark size={26} spin />
          <span className="font-display font-bold text-white tracking-tight text-lg">APERTURE</span>
        </Link>

        {searchOpen ? (
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 mx-4">
            <input
              autoFocus
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search products…"
              className="w-full bg-white/10 text-white placeholder-white/40 rounded-full px-4 py-2 text-sm focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
              className="text-white/60 hover:text-white p-1"
            >
              <X size={18} />
            </button>
          </form>
        ) : (
          <>
            <nav className="hidden md:flex items-center">
              <MagneticDock
                items={[
                  { to: '/#home', label: 'Home' },
                  { to: '/#shop', label: 'Shop' },
                  { to: '/#about', label: 'About' },
                  { to: '/#faq', label: "FAQ's" },
                  { to: '/#contact', label: 'Contact' },
                  ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
                ]}
                itemClassName={sectionLinkCls}
              />
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="hidden sm:flex p-2 text-white/70 hover:text-white"
              >
                <Search size={18} />
              </button>

              <NavLink
                to="/cart"
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
              >
                Cart{count > 0 ? ` (${count})` : ''}
              </NavLink>

              {isAuthenticated ? (
                <>
                  <NavLink
                    to="/orders"
                    className="hidden sm:flex items-center px-4 py-2 rounded-full text-white/70 hover:text-white text-sm transition-colors"
                  >
                    My Orders
                  </NavLink>
                  <button onClick={handleLogout} className="px-4 py-2 rounded-full bg-flash-500 text-white text-sm font-medium hover:bg-flash-600 transition-colors">
                    Log out
                  </button>
                </>
              ) : (
                <button onClick={() => loginWithRedirect()} className="px-4 py-2 rounded-full bg-flash-500 text-white text-sm font-medium hover:bg-flash-600 transition-colors">
                  Log in
                </button>
              )}

              <button
                className="md:hidden p-2 text-white"
                aria-label="Toggle menu"
                onClick={() => setOpen((o) => !o)}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      {open && (
        <div className="md:hidden mt-2 mx-auto max-w-6xl bg-ink rounded-3xl p-4 flex flex-col gap-1">
          <Link to="/#home" className={sectionLinkCls} onClick={() => setOpen(false)}>Home</Link>
          <Link to="/#shop" className={sectionLinkCls} onClick={() => setOpen(false)}>Shop</Link>
          <Link to="/#about" className={sectionLinkCls} onClick={() => setOpen(false)}>About</Link>
          <Link to="/#faq" className={sectionLinkCls} onClick={() => setOpen(false)}>FAQ's</Link>
          <Link to="/#contact" className={sectionLinkCls} onClick={() => setOpen(false)}>Contact</Link>
          <NavLink to="/cart" className={navLink} onClick={() => setOpen(false)}>Cart{count > 0 ? ` (${count})` : ''}</NavLink>
          {isAuthenticated && (
            <NavLink to="/orders" className={navLink} onClick={() => setOpen(false)}>My Orders</NavLink>
          )}
          {isAdmin && <NavLink to="/admin" className={navLink} onClick={() => setOpen(false)}>Admin</NavLink>}
        </div>
      )}
    </header>
  );
}
