const express = require('express');
const Stripe = require('stripe');
const db = require('../config/db');
const checkJwt = require('../middleware/checkJwt');
const { requireRole } = require('../middleware/requireRole');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

router.use(checkJwt, requireRole('admin'));

// Small inline Auth0 Management API helper — used only for the customer
// profile lookup on the order detail endpoint below. Best-effort: returns
// null on any failure rather than throwing, so a profile lookup issue never
// breaks the order detail page around it.
async function lookupCustomerProfile(auth0UserId) {
  try {
    const tokenResp = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.AUTH0_M2M_CLIENT_ID,
        client_secret: process.env.AUTH0_M2M_CLIENT_SECRET,
        audience: `${process.env.AUTH0_ISSUER_BASE_URL}api/v2/`,
        grant_type: 'client_credentials',
      }),
    });
    if (!tokenResp.ok) return null;
    const { access_token } = await tokenResp.json();

    const userResp = await fetch(
      `${process.env.AUTH0_ISSUER_BASE_URL}api/v2/users/${encodeURIComponent(auth0UserId)}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    if (!userResp.ok) return null;
    const user = await userResp.json();
    return { name: user.name || null, email: user.email || null, picture: user.picture || null };
  } catch (err) {
    console.error('Auth0 profile lookup failed:', err.message);
    return null;
  }
}

// GET /api/admin/dashboard - overview numbers for the Dashboard page.
// The response shape here is intentionally matched field-for-field to what
// client/src/pages/AdminDashboard.js actually reads (activeSales.last7Days,
// productRevenue.changePct, topProducts[].status, etc.) — this endpoint and
// that component must be changed together, or you get the
// "Cannot read properties of undefined (reading 'map')" crash this fixes.
router.get('/dashboard', async (req, res, next) => {
  try {
    const [
      overviewResult,
      activeSalesResult,
      last7DaysResult,
      revenueResult,
      salesTrendResult,
      topProductsResult,
      conversionResult,
    ] = await Promise.all([
      db.query(
        `SELECT
           COALESCE(SUM(total_cents) FILTER (WHERE status = 'paid'), 0) AS total_sales_cents,
           COUNT(*) FILTER (WHERE status = 'paid' AND created_at >= now() - interval '30 days') AS new_sales_count
         FROM orders`
      ),
      db.query(
        `SELECT
           COALESCE(SUM(total_cents) FILTER (WHERE created_at >= now() - interval '30 days'), 0) AS current_cents,
           COALESCE(SUM(total_cents) FILTER (WHERE created_at >= now() - interval '60 days' AND created_at < now() - interval '30 days'), 0) AS previous_cents
         FROM orders WHERE status = 'paid'`
      ),
      db.query(
        `SELECT date_trunc('day', created_at) AS day, SUM(total_cents) AS revenue_cents
         FROM orders WHERE status = 'paid' AND created_at >= now() - interval '7 days'
         GROUP BY day ORDER BY day ASC`
      ),
      db.query(
        `SELECT
           COALESCE(SUM(total_cents) FILTER (WHERE created_at >= date_trunc('month', now())), 0) AS current_cents,
           COALESCE(SUM(total_cents) FILTER (
             WHERE created_at >= date_trunc('month', now()) - interval '1 month'
               AND created_at < date_trunc('month', now())
           ), 0) AS previous_cents
         FROM orders WHERE status = 'paid'`
      ),
      db.query(
        `SELECT date_trunc('day', created_at) AS day, SUM(total_cents) AS revenue_cents
         FROM orders WHERE status = 'paid' AND created_at >= now() - interval '30 days'
         GROUP BY day ORDER BY day ASC`
      ),
      db.query(
        `SELECT p.id, p.name, p.stock, SUM(oi.quantity) AS units_sold, SUM(oi.quantity * oi.unit_price_cents) AS revenue_cents
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id AND o.status = 'paid'
         JOIN products p ON p.id = oi.product_id
         GROUP BY p.id, p.name, p.stock ORDER BY revenue_cents DESC LIMIT 5`
      ),
      db.query(`SELECT COUNT(*) FILTER (WHERE status = 'paid') AS paid_count, COUNT(*) AS total_count FROM orders`),
    ]);

    // % change helper — if there's nothing to compare against (previous
    // period was $0), treat any current revenue as a flat +100% rather than
    // dividing by zero into Infinity/NaN.
    const changePct = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 1000) / 10;
    };

    const activeSalesCurrent = Number(activeSalesResult.rows[0].current_cents);
    const activeSalesPrevious = Number(activeSalesResult.rows[0].previous_cents);
    const revenueCurrent = Number(revenueResult.rows[0].current_cents);
    const revenuePrevious = Number(revenueResult.rows[0].previous_cents);
    const { paid_count, total_count } = conversionResult.rows[0];

    res.json({
      overview: {
        totalSalesCents: Number(overviewResult.rows[0].total_sales_cents),
        newSalesCount: Number(overviewResult.rows[0].new_sales_count),
      },
      activeSales: {
        valueCents: activeSalesCurrent,
        changePct: changePct(activeSalesCurrent, activeSalesPrevious),
        last7Days: last7DaysResult.rows.map((r) => ({ day: r.day, revenueCents: Number(r.revenue_cents) })),
      },
      productRevenue: {
        valueCents: revenueCurrent,
        changePct: changePct(revenueCurrent, revenuePrevious),
      },
      salesTrend: salesTrendResult.rows.map((r) => ({ day: r.day, revenueCents: Number(r.revenue_cents) })),
      salesPerformance: {
        conversionRate: Number(total_count) > 0 ? Number(paid_count) / Number(total_count) : 0,
        paidCount: Number(paid_count),
        totalCount: Number(total_count),
      },
      topProducts: topProductsResult.rows.map((r) => ({
        id: r.id,
        name: r.name,
        unitsSold: Number(r.units_sold),
        revenueCents: Number(r.revenue_cents),
        stock: r.stock,
        status: r.stock > 0 ? 'In Stock' : 'Out of Stock',
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders?limit=50 - all orders across all users. Runs under
// withServiceContext (the one trusted server-only path) rather than
// withUserContext, which would only ever return the admin's own orders
// under RLS.
router.get('/orders', async (req, res, next) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  try {
    const orders = await db.withServiceContext(async (client) => {
      const { rows } = await client.query(
        `SELECT id, auth0_user_id, status, total_cents, currency, created_at
         FROM orders ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      return rows;
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders/:id - full detail for one order: line items, a
// best-effort customer profile from Auth0, and best-effort live payment
// details from Stripe.
router.get('/orders/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid order id' });

    const order = await db.withServiceContext(async (client) => {
      const orderResult = await client.query(
        `SELECT id, auth0_user_id, status, total_cents, currency, created_at, stripe_session_id
         FROM orders WHERE id = $1`,
        [id]
      );
      if (orderResult.rows.length === 0) return null;
      return orderResult.rows[0];
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const itemsResult = await db.query(
      `SELECT oi.quantity, oi.unit_price_cents, p.id AS product_id, p.name, p.image_url
       FROM order_items oi JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1 ORDER BY oi.id ASC`,
      [id]
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
// Pending order (never actually charged) -> just marked cancelled, nothing
// to refund. Paid/fulfilled order -> issues a REAL Stripe refund for the
// full amount before marking it cancelled, and restores the stock that was
// decremented when the order was originally paid (mirroring the decrement
// logic in routes/webhook.js).
router.post('/orders/:id/cancel', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid order id' });

    const order = await db.withServiceContext(async (client) => {
      const { rows } = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
      return rows[0] || null;
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'cancelled') return res.status(400).json({ error: 'Order is already cancelled' });

    let refunded = false;
    if (order.status === 'paid' || order.status === 'fulfilled') {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (session.payment_intent) {
        await stripe.refunds.create({ payment_intent: session.payment_intent });
        refunded = true;
      }
    }

    await db.withServiceContext(async (client) => {
      await client.query(
        `UPDATE orders SET status = $1 WHERE id = $2`,
        [refunded ? 'refunded' : 'cancelled', id]
      );
      if (refunded) {
        await client.query(
          `UPDATE products p SET stock = p.stock + oi.quantity
           FROM order_items oi WHERE oi.order_id = $1 AND oi.product_id = p.id`,
          [id]
        );
      }
    });

    res.json({ cancelled: true, refunded });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/customers - derived entirely from orders (Auth0 owns
// identity, there's no separate customer-profile table).
router.get('/customers', async (req, res, next) => {
  try {
    const customers = await db.withServiceContext(async (client) => {
      const { rows } = await client.query(
        `SELECT
           auth0_user_id AS "auth0UserId",
           COUNT(*) AS "orderCount",
           SUM(total_cents) FILTER (WHERE status = 'paid') AS "totalSpentCents",
           MAX(created_at) AS "lastOrderAt"
         FROM orders
         GROUP BY auth0_user_id
         ORDER BY "lastOrderAt" DESC`
      );
      return rows.map((r) => ({
        ...r,
        orderCount: Number(r.orderCount),
        totalSpentCents: Number(r.totalSpentCents || 0),
      }));
    });
    res.json(customers);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
