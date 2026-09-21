const express = require('express');
const Stripe = require('stripe');
const db = require('../config/db');
const checkJwt = require('../middleware/checkJwt');
const { requireRole } = require('../middleware/requireRole');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

router.use(checkJwt, requireRole('admin'));

// GET /api/admin/dashboard - overview numbers for the Dashboard page.
router.get('/dashboard', async (req, res, next) => {
  try {
    const [overviewResult, activeSalesResult, revenueResult, salesTrendResult, topProductsResult] =
      await Promise.all([
        db.query(
          `SELECT COALESCE(SUM(total_cents), 0) AS total_cents, COUNT(*) AS order_count
           FROM orders WHERE status = 'paid'`
        ),
        db.query(
          `SELECT COALESCE(SUM(total_cents), 0) AS total_cents
           FROM orders WHERE status = 'paid' AND created_at >= now() - interval '30 days'`
        ),
        db.query(
          `SELECT COALESCE(SUM(total_cents), 0) AS total_cents
           FROM orders WHERE status = 'paid' AND created_at >= date_trunc('month', now())`
        ),
        db.query(
          `SELECT date_trunc('day', created_at) AS day, SUM(total_cents) AS revenue_cents
           FROM orders WHERE status = 'paid' AND created_at >= now() - interval '30 days'
           GROUP BY day ORDER BY day ASC`
        ),
        db.query(
          `SELECT p.name, SUM(oi.quantity) AS units_sold, SUM(oi.quantity * oi.unit_price_cents) AS revenue_cents
           FROM order_items oi
           JOIN orders o ON o.id = oi.order_id AND o.status = 'paid'
           JOIN products p ON p.id = oi.product_id
           GROUP BY p.name ORDER BY revenue_cents DESC LIMIT 5`
        ),
      ]);

    const conversionResult = await db.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'paid') AS paid_count, COUNT(*) AS total_count FROM orders`
    );
    const { paid_count, total_count } = conversionResult.rows[0];
    const conversionRate = Number(total_count) > 0 ? Number(paid_count) / Number(total_count) : 0;

    res.json({
      overview: {
        totalCents: Number(overviewResult.rows[0].total_cents),
        orderCount: Number(overviewResult.rows[0].order_count),
      },
      activeSales: { last30DaysCents: Number(activeSalesResult.rows[0].total_cents) },
      productRevenue: { thisMonthCents: Number(revenueResult.rows[0].total_cents) },
      salesTrend: salesTrendResult.rows.map((r) => ({ day: r.day, revenueCents: Number(r.revenue_cents) })),
      salesPerformance: { conversionRate },
      topProducts: topProductsResult.rows.map((r) => ({
        name: r.name,
        unitsSold: Number(r.units_sold),
        revenueCents: Number(r.revenue_cents),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders?limit=50 - all orders across all users (admin-wide view).
router.get('/orders', async (req, res, next) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  try {
    const { rows } = await db.query(
      `SELECT id, auth0_user_id, status, total_cents, currency, created_at
       FROM orders ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Auth0 Management API token — same pattern as routes/account.js's GDPR
// delete flow. Needs the same M2M app/credentials already set up for that.
async function getManagementApiToken() {
  const resp = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.AUTH0_M2M_CLIENT_ID,
      client_secret: process.env.AUTH0_M2M_CLIENT_SECRET,
      audience: `${process.env.AUTH0_ISSUER_BASE_URL}api/v2/`,
      grant_type: 'client_credentials',
    }),
  });
  if (!resp.ok) throw new Error('Failed to get Auth0 Management API token');
  const data = await resp.json();
  return data.access_token;
}

// Best-effort customer profile lookup — falls back to just the raw Auth0 id
// if the Management API call fails for any reason (missing M2M credentials,
// network issue, etc.), so a lookup failure never breaks the order detail page.
async function lookupCustomerProfile(auth0UserId) {
  try {
    const token = await getManagementApiToken();
    const resp = await fetch(
      `${process.env.AUTH0_ISSUER_BASE_URL}api/v2/users/${encodeURIComponent(auth0UserId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!resp.ok) return { id: auth0UserId, email: null, name: null };
    const user = await resp.json();
    return { id: auth0UserId, email: user.email || null, name: user.name || null };
  } catch {
    return { id: auth0UserId, email: null, name: null };
  }
}

// GET /api/admin/orders/:id - full detail for one order: items, payment
// info, and the customer's profile. Admin can view ANY order (no RLS
// ownership restriction, unlike the customer-facing /api/orders/:id).
router.get('/orders/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid order id' });

    const orderResult = await db.query(
      `SELECT id, auth0_user_id, status, total_cents, currency, stripe_session_id, created_at
       FROM orders WHERE id = $1`,
      [id]
    );
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orderResult.rows[0];

    const itemsResult = await db.query(
      `SELECT oi.quantity, oi.unit_price_cents, p.id AS product_id, p.name, p.image_url
       FROM order_items oi JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1 ORDER BY oi.id ASC`,
      [order.id]
    );

    const customer = await lookupCustomerProfile(order.auth0_user_id);

    // Best-effort live payment details from Stripe — a lookup failure here
    // (network blip, session expired, etc.) shouldn't break the whole order
    // detail page, so payment just comes back null and the UI shows
    // "unavailable" rather than erroring out.
    let payment = null;
    try {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id, {
        expand: ['payment_intent.payment_method', 'payment_intent.latest_charge'],
      });
      const pm = session.payment_intent?.payment_method;
      const charge = session.payment_intent?.latest_charge;
      payment = {
        paymentIntentId: session.payment_intent?.id || null,
        cardBrand: pm?.card?.brand || null,
        cardLast4: pm?.card?.last4 || null,
        receiptUrl: typeof charge === 'object' ? charge?.receipt_url || null : null,
        amountReceived: session.payment_intent?.amount_received ?? null,
      };
    } catch (err) {
      console.error('Stripe payment lookup failed for order', id, ':', err.message);
    }

    res.json({ ...order, items: itemsResult.rows, customer, payment });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/orders/:id/cancel
// - 'pending' order (never actually paid): just mark it cancelled, nothing
//   to refund.
// - 'paid' order: issue a real Stripe refund against the original payment,
//   restock the items, then mark it 'refunded'. Refunding is the correct
//   way to "cancel" something a customer already paid for — silently
//   changing a status label without returning their money would not be.
router.post('/orders/:id/cancel', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid order id' });

    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orderResult.rows[0];

    if (order.status === 'cancelled' || order.status === 'refunded') {
      return res.status(400).json({ error: `Order is already ${order.status}` });
    }

    if (order.status === 'pending') {
      await db.withServiceContext(async (client) => {
        await client.query(`UPDATE orders SET status = 'cancelled' WHERE id = $1`, [id]);
      });
      return res.json({ status: 'cancelled', refunded: false });
    }

    // status === 'paid' -> issue a real refund via Stripe
    const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
    if (!session.payment_intent) {
      return res.status(400).json({ error: 'No payment found for this order to refund' });
    }
    await stripe.refunds.create({ payment_intent: session.payment_intent });

    await db.withServiceContext(async (client) => {
      await client.query(`UPDATE orders SET status = 'refunded' WHERE id = $1`, [id]);
      // Restock exactly what was refunded, undoing the decrement the
      // webhook applied when the order was originally paid.
      await client.query(
        `UPDATE products p
         SET stock = p.stock + oi.quantity
         FROM order_items oi
         WHERE oi.order_id = $1 AND oi.product_id = p.id`,
        [id]
      );
    });

    res.json({ status: 'refunded', refunded: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/customers
// Derived entirely from orders — there's no separate customer-profile table
// (Auth0 owns identity), so this aggregates what we actually have: order
// count and lifetime spend per auth0_user_id.
router.get('/customers', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT
         auth0_user_id AS "auth0UserId",
         COUNT(*) AS "orderCount",
         SUM(total_cents) FILTER (WHERE status = 'paid') AS "totalSpentCents",
         MAX(created_at) AS "lastOrderAt"
       FROM orders
       GROUP BY auth0_user_id
       ORDER BY "lastOrderAt" DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
