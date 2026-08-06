const express = require('express');
const db = require('../config/db');
const checkJwt = require('../middleware/checkJwt');

const router = express.Router();

// GET /api/orders - a user can only ever see their own orders.
// We take the user id from the verified JWT (req.auth.payload.sub), never from
// a query param or request body. We ALSO run the query inside
// db.withUserContext(), which sets the RLS session variable Postgres checks —
// so even a future route that forgets a WHERE clause still can't leak another
// user's orders. Defense in depth: app-level identity + database-level policy.
router.get('/', checkJwt, async (req, res, next) => {
  try {
    const auth0UserId = req.auth.payload.sub;
    const orders = await db.withUserContext(auth0UserId, async (client) => {
      const { rows } = await client.query(
        `SELECT id, status, total_cents, currency, created_at
         FROM orders ORDER BY created_at DESC`
      );
      return rows;
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// Shared helper: loads one order (scoped to the current user via RLS) plus
// its line items joined with product names, so the customer sees "Wireless
// Headphones x2" rather than just a bare product_id.
async function loadOrderWithItems(auth0UserId, whereClause, param) {
  return db.withUserContext(auth0UserId, async (client) => {
    const orderResult = await client.query(
      `SELECT id, status, total_cents, currency, created_at, stripe_session_id
       FROM orders WHERE ${whereClause} LIMIT 1`,
      [param]
    );
    if (orderResult.rows.length === 0) return null;
    const order = orderResult.rows[0];

    const itemsResult = await client.query(
      `SELECT oi.quantity, oi.unit_price_cents, p.name, p.image_url
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1
       ORDER BY oi.id ASC`,
      [order.id]
    );

    return { ...order, items: itemsResult.rows };
  });
}

// GET /api/orders/:id - full itemized detail for one order, for the
// customer's own "My Orders" -> order detail view.
router.get('/:id', checkJwt, async (req, res, next) => {
  try {
    const auth0UserId = req.auth.payload.sub;
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid order id' });

    const order = await loadOrderWithItems(auth0UserId, 'id = $1', id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/by-session/:sessionId - looks up an order by its Stripe
// Checkout session id. This is what the post-checkout success page uses,
// since Stripe's success_url only gives us the session id in the URL, not
// our own numeric order id. Still scoped to the current user via RLS — a
// session id belonging to someone else's order simply won't be found.
router.get('/by-session/:sessionId', checkJwt, async (req, res, next) => {
  try {
    const auth0UserId = req.auth.payload.sub;
    const order = await loadOrderWithItems(auth0UserId, 'stripe_session_id = $1', req.params.sessionId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
