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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const isAdmin = (user?.[ROLE_CLAIM] || []).map((r) => r.trim()).includes('admin');

  // Glass/blur effect once the page has scrolled past the hero — a subtle
  // signal that the nav is now floating over content rather than sitting on
  // the plain page background, matching the "blur on scroll" ask.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    clearCart();
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/?q=${encodeURIComponent(query.trim())}#shop`);
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-4 z-30 mx-4 md:mx-8">
      <div
        className={`mx-auto max-w-6xl rounded-full flex items-center justify-between px-4 py-2 transition-all duration-300 ${
          scrolled ? 'bg-ink/80 backdrop-blur-md shadow-lg shadow-ink/20' : 'bg-ink shadow-lg shadow-ink/10'
        }`}
      >
        <Link to="/#home" className="flex items-center gap-2 pl-1 pr-3 shrink-0">
          <ApertureMark size={26} spin />
          <span className="font-display font-bold text-white tracking-tight text-lg hidden sm:inline">APERTURE</span>
        </Link>

        {searchOpen ? (
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 mx-3">
            <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5">
              <Search size={15} className="text-white/50 shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products…"
                className="bg-transparent text-white text-sm placeholder-white/40 focus:outline-none flex-1"
              />
            </div>
            <button type="button" onClick={() => setSearchOpen(false)} className="text-white/60 hover:text-white p-1">
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
                className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Search"
              >
                <Search size={18} />
              </button>
              <NavLink
                to="/cart"
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
              >
                {count > 0 ? `Cart (${count})` : 'Cart'}
              </NavLink>
              {isAuthenticated ? (
                <button onClick={handleLogout} className="px-4 py-2 rounded-full bg-flash-500 text-white text-sm font-medium hover:bg-flash-600 transition-colors">
                  Log out
                </button>
              ) : (
                <button onClick={() => loginWithRedirect()} className="px-4 py-2 rounded-full bg-flash-500 text-white text-sm font-medium hover:bg-flash-600 transition-colors">
                  Log in
                </button>
              )}
              <button className="md:hidden p-2 text-white" aria-label="Toggle menu" onClick={() => setOpen((o) => !o)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      {open && !searchOpen && (
        <div className="md:hidden mt-2 mx-auto max-w-6xl bg-ink rounded-3xl p-4 flex flex-col gap-1">
          <Link to="/#home" className={sectionLinkCls} onClick={() => setOpen(false)}>Home</Link>
          <Link to="/#shop" className={sectionLinkCls} onClick={() => setOpen(false)}>Shop</Link>
          <Link to="/#about" className={sectionLinkCls} onClick={() => setOpen(false)}>About</Link>
          <Link to="/#faq" className={sectionLinkCls} onClick={() => setOpen(false)}>FAQ's</Link>
          <Link to="/#contact" className={sectionLinkCls} onClick={() => setOpen(false)}>Contact</Link>
          <NavLink to="/cart" className={navLink} onClick={() => setOpen(false)}>Cart{count > 0 ? ` (${count})` : ''}</NavLink>
          {isAdmin && <NavLink to="/admin" className={navLink} onClick={() => setOpen(false)}>Admin</NavLink>}
        </div>
      )}
    </header>
  );
}
