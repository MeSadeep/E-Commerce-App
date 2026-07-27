import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import App from './App';
import Auth0ProviderWithHistory from './auth/Auth0ProviderWithHistory';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './components/ui/Toast';
import { initAnalytics } from './utils/analytics';
import './index.css';

// Both are safely no-ops if their env vars aren't set — nothing breaks in
// local dev if you haven't configured Sentry/Google Analytics yet.
if (process.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({ dsn: process.env.REACT_APP_SENTRY_DSN, tracesSampleRate: 0.2 });
}
initAnalytics();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Auth0ProviderWithHistory>
        <ToastProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </ToastProvider>
      </Auth0ProviderWithHistory>
    </BrowserRouter>
  </React.StrictMode>
);
