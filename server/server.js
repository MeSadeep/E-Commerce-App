require('dotenv').config(); // loads .env — secrets never live in the source code itself

const Sentry = process.env.SENTRY_DSN ? require('@sentry/node') : null;
if (Sentry) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV, tracesSampleRate: 0.2 });
}

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const productsRouter = require('./routes/products');
const checkoutRouter = require('./routes/checkout');
const ordersRouter = require('./routes/orders');
const webhookRouter = require('./routes/webhook');
const adminRouter = require('./routes/admin');
const dashboardRouter = require('./routes/dashboard');
const analyticsRouter = require('./routes/analytics');
const accountRouter = require('./routes/account');
const { startLowStockJob } = require('./jobs/lowStockAlert');

const app = express();

// --- Security middleware ---
app.use(helmet()); // sets secure HTTP headers (CSP, X-Frame-Options, etc.)
app.use(
  cors({
    origin: process.env.CLIENT_URL, // only our own frontend can call this API from a browser
    credentials: true,
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// General rate limit on all API routes — slows down brute-force / scraping bots.
// Much higher in development: a frontend bug (like an unmemoized effect
// dependency causing a fetch loop) shouldn't lock you out of local testing
// for the full 15-minute window. Production keeps the stricter limit.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 300 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Stricter limiter specifically for checkout, since it triggers real payment/DB writes
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
});

// --- Stripe webhook must be mounted BEFORE express.json() ---
// Stripe's signature verification needs the raw, untouched request body.
// If express.json() ran first, the body would already be parsed and the
// signature check would fail.
app.use('/webhook', webhookRouter);

// Now safe to parse JSON for the rest of the app
app.use(express.json());

// --- Routes ---
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/products', productsRouter);
app.use('/api/checkout', checkoutLimiter, checkoutRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin', dashboardRouter);
app.use('/api/admin/analytics', analyticsRouter);
app.use('/api/account', accountRouter);

if (Sentry) app.use(Sentry.expressErrorHandler());

// --- Central error handler ---
// Never leak stack traces or internal details to the client in production.
app.use((err, req, res, next) => {
  console.error(err);
  if (err.status === 401 || err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid or missing authentication token' });
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

if (require.main === module) startLowStockJob();

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app; // exported (not just listened on) so tests can import it directly
