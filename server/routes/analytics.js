const express = require('express');
const db = require('../config/db');
const checkJwt = require('../middleware/checkJwt');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.use(checkJwt, requireRole('admin'));

// GET /api/admin/analytics/sales?days=30
// Daily revenue + order count for the last N days (paid orders only).
router.get('/sales', async (req, res, next) => {
  const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
  try {
    const { rows } = await db.query(
      `SELECT
         date_trunc('day', created_at) AS day,
         COUNT(*) AS order_count,
         SUM(total_cents) AS revenue_cents
       FROM orders
       WHERE status = 'paid' AND created_at >= now() - ($1 || ' days')::interval
       GROUP BY day
       ORDER BY day ASC`,
      [days]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/analytics/conversion
// Paid orders vs. total orders started (a simple proxy for conversion rate).
router.get('/conversion', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'paid') AS paid_count,
         COUNT(*) AS total_count
       FROM orders`
    );
    const { paid_count, total_count } = rows[0];
    const rate = total_count > 0 ? Number(paid_count) / Number(total_count) : 0;
    res.json({ paid_count: Number(paid_count), total_count: Number(total_count), conversion_rate: rate });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/analytics/abandoned-carts
// Requires the optional server-side "carts" table (see db/schema.sql) —
// carts untouched for 24h+ that were never checked out.
router.get('/abandoned-carts', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT auth0_user_id, items, updated_at
       FROM carts
       WHERE checked_out = false AND updated_at < now() - interval '24 hours'
       ORDER BY updated_at DESC
       LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// NOTE: overview/active-sales/revenue/top-products summary numbers now live
// in routes/dashboard.js's single GET /api/admin/dashboard call, which is
// what AdminDashboard.js actually uses — kept here to a stable single source
// rather than duplicating the same aggregate queries in two places.

module.exports = router;
