const { assertDashboard } = require('../contracts/dashboard.cjs');
const express = require('express');
const Stripe = require('stripe');
const db = require('../config/db');
const checkJwt = require('../middleware/checkJwt');
const { requireRole } = require('../middleware/requireRole');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY, {timeout:10000,maxNetworkRetries:1});
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
  const days = req.query.days === undefined ? 30 : Number(req.query.days);
  const currency = req.query.currency || 'usd';
  if (![7, 30, 90, 365].includes(days) || !['usd','eur','gbp','lkr'].includes(currency)) {
    return res.status(400).json({error: 'Choose a supported period and currency'});
  }
  try {
    const payload = await db.withServiceContext(async client => {
      const {rows: [summary]} = await client.query(`
        SELECT
          COALESCE(SUM(total_cents) FILTER (WHERE status = 'paid' AND created_at >= now() - $1 * interval '1 day'),0) AS current,
          COALESCE(SUM(total_cents) FILTER (WHERE status = 'paid' AND created_at < now() - $1 * interval '1 day'),0) AS previous,
          COUNT(*) FILTER (WHERE status = 'paid' AND created_at >= now() - $1 * interval '1 day') AS paid,
          COUNT(*) FILTER (WHERE created_at >= now() - $1 * interval '1 day') AS total
        FROM orders WHERE currency = $2 AND created_at >= now() - (2 * $1) * interval '1 day' AND created_at <= now()`, [days, currency]);
      const {rows: trend} = await client.query(`
        SELECT date_trunc('day',created_at) AS day, SUM(total_cents) AS revenue_cents
        FROM orders WHERE status = 'paid' AND currency = $2
        AND created_at >= now() - $1 * interval '1 day' AND created_at <= now()
        GROUP BY day ORDER BY day`, [days, currency]);
      const {rows: products} = await client.query(`
        SELECT p.id,p.name,p.stock,SUM(oi.quantity) AS units_sold,SUM(oi.quantity * oi.unit_price_cents) AS revenue_cents
        FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id
        WHERE o.status = 'paid' AND o.currency = $2 AND o.created_at >= now() - $1 * interval '1 day' AND o.created_at <= now()
        GROUP BY p.id,p.name,p.stock ORDER BY revenue_cents DESC LIMIT 5`, [days, currency]);
      const current = Number(summary.current), previous = Number(summary.previous);
      const change = previous ? Math.round((current-previous)/previous*1000)/10 : (current ? 100 : 0);
      const series = trend.map(r => ({day:r.day, revenueCents:Number(r.revenue_cents)}));
      return {
        filters: {days,currency},
        overview: {totalSalesCents:current,newSalesCount:Number(summary.paid)},
        activeSales: {valueCents:current,changePct:change,last7Days:series},
        productRevenue: {valueCents:current,changePct:change},
        salesTrend:series,
        salesPerformance: {conversionRate:Number(summary.total) ? Number(summary.paid)/Number(summary.total) : 0,paidCount:Number(summary.paid),totalCount:Number(summary.total)},
        topProducts:products.map(r => ({id:r.id,name:r.name,stock:r.stock,unitsSold:Number(r.units_sold),revenueCents:Number(r.revenue_cents),status:r.stock>0?'In Stock':'Out of Stock'}))
      };
    });
    assertDashboard(JSON.parse(JSON.stringify(payload)));
    res.json(payload);
  } catch (err) {next(err);}
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

    const itemsResult = await db.withServiceContext(client => client.query(
      `SELECT oi.quantity, oi.unit_price_cents, p.id AS product_id, p.name, p.image_url
       FROM order_items oi JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1 ORDER BY oi.id ASC`,
      [id]
    ));

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

// Admin-only pending cancellation. Lock serializes webhook/cancel transitions.
router.post('/orders/:id/cancel', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({error:'Invalid order id'});
  try {
    const result = await db.withServiceContext(async client => {
      const {rows:[order]} = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE',[id]);
      if (!order) return {status:404,error:'Order not found'};
      if (order.status === 'cancelled') return {status:200,cancelled:true,refunded:false};
      if (order.status !== 'pending') return {status:409,error:'Only pending orders can be cancelled. Paid orders require the refund workflow.'};
      let session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (session.status === 'open' && session.payment_status === 'unpaid') {
        try {
          session = await stripe.checkout.sessions.expire(session.id, {}, {idempotencyKey:`cancel-pending-${session.id}`});
        } catch (err) {
          // Payment or another expiry may have won the race. Re-read Stripe.
          session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
          if (session.status !== 'expired') throw Object.assign(new Error('Checkout changed or could not be expired. Refresh and retry.'),{status:409});
        }
      }
      if (session.status !== 'expired' || session.payment_status !== 'unpaid') {
        return {status:409,error:'Checkout is completed or payment is processing. It cannot be cancelled as pending.'};
      }
      await client.query("UPDATE orders SET status = 'cancelled' WHERE id = $1 AND status = 'pending'",[id]);
      // Pending orders never deducted stock. Do not restock or refund.
      return {status:200,cancelled:true,refunded:false};
    });
    const {status,...body}=result;
    res.status(status).json(body);
  } catch(err) {next(err);}
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
