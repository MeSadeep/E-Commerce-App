const express = require('express');
const db = require('../config/db');
const checkJwt = require('../middleware/checkJwt');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

// Every route below requires: valid Auth0 login AND the "admin" role claim.
router.use(checkJwt, requireRole('admin'));

// GET /api/admin/dashboard
// One call that powers the whole dashboard view — batches several
// aggregate queries together instead of making the frontend fire off five
// separate requests for one screen. Every number here comes from real rows
// in orders/order_items/products; nothing is a placeholder.
router.get('/dashboard', async (req, res, next) => {
  try {
    const result = await db.withServiceContext(async (client) => {
      const [overview, activeSales, revenueByMonth, last7Days, conversion, salesTrend, topProducts] =
        await Promise.all([
          // Product overview — all-time paid total + how many orders paid in the last 30 days
          client.query(`
            SELECT
              COALESCE(SUM(total_cents) FILTER (WHERE status = 'paid'), 0) AS total_sales_cents,
              COUNT(*) FILTER (WHERE status = 'paid' AND created_at >= now() - interval '30 days') AS new_sales_count
            FROM orders
          `),
          // Active sales — revenue in the last 30 days vs the 30 days before that
          client.query(`
            SELECT
              COALESCE(SUM(total_cents) FILTER (WHERE created_at >= now() - interval '30 days'), 0) AS current_cents,
              COALESCE(SUM(total_cents) FILTER (WHERE created_at >= now() - interval '60 days' AND created_at < now() - interval '30 days'), 0) AS previous_cents
            FROM orders WHERE status = 'paid'
          `),
          // Product revenue — this calendar month vs last calendar month
          client.query(`
            SELECT
              COALESCE(SUM(total_cents) FILTER (WHERE date_trunc('month', created_at) = date_trunc('month', now())), 0) AS current_cents,
              COALESCE(SUM(total_cents) FILTER (WHERE date_trunc('month', created_at) = date_trunc('month', now() - interval '1 month')), 0) AS previous_cents
            FROM orders WHERE status = 'paid'
          `),
          // Mini bar chart — daily revenue for the last 7 days
          client.query(`
            SELECT date_trunc('day', created_at) AS day, COALESCE(SUM(total_cents), 0) AS revenue_cents
            FROM orders
            WHERE status = 'paid' AND created_at >= now() - interval '7 days'
            GROUP BY day ORDER BY day ASC
          `),
          // Sales performance gauge — paid vs total orders started
          client.query(`
            SELECT
              COUNT(*) FILTER (WHERE status = 'paid') AS paid_count,
              COUNT(*) AS total_count
            FROM orders
          `),
          // Analytics line chart — daily revenue for the last 30 days
          client.query(`
            SELECT date_trunc('day', created_at) AS day, COALESCE(SUM(total_cents), 0) AS revenue_cents
            FROM orders
            WHERE status = 'paid' AND created_at >= now() - interval '30 days'
            GROUP BY day ORDER BY day ASC
          `),
          // Top products by revenue (paid orders only)
          client.query(`
            SELECT p.id, p.name, p.stock,
                   SUM(oi.quantity) AS units_sold,
                   SUM(oi.quantity * oi.unit_price_cents) AS revenue_cents
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            JOIN products p ON p.id = oi.product_id
            WHERE o.status = 'paid'
            GROUP BY p.id
            ORDER BY revenue_cents DESC
            LIMIT 5
          `),
        ]);

      const pct = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Number((((current - previous) / previous) * 100).toFixed(1));
      };

      const ov = overview.rows[0];
      const as = activeSales.rows[0];
      const rv = revenueByMonth.rows[0];
      const cv = conversion.rows[0];

      return {
        overview: {
          totalSalesCents: Number(ov.total_sales_cents),
          newSalesCount: Number(ov.new_sales_count),
        },
        activeSales: {
          valueCents: Number(as.current_cents),
          changePct: pct(Number(as.current_cents), Number(as.previous_cents)),
          last7Days: last7Days.rows.map((r) => ({ day: r.day, revenueCents: Number(r.revenue_cents) })),
        },
        productRevenue: {
          valueCents: Number(rv.current_cents),
          changePct: pct(Number(rv.current_cents), Number(rv.previous_cents)),
        },
        salesPerformance: {
          conversionRate: Number(cv.total_count) > 0 ? Number(cv.paid_count) / Number(cv.total_count) : 0,
          paidCount: Number(cv.paid_count),
          totalCount: Number(cv.total_count),
        },
        salesTrend: salesTrend.rows.map((r) => ({ day: r.day, revenueCents: Number(r.revenue_cents) })),
        topProducts: topProducts.rows.map((r) => ({
          id: r.id,
          name: r.name,
          unitsSold: Number(r.units_sold),
          revenueCents: Number(r.revenue_cents),
          stock: r.stock,
          status: r.stock > 0 ? 'In Stock' : 'Out of stock',
        })),
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders?limit=50 — all orders, most recent first
router.get('/orders', async (req, res, next) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  try {
    const rows = await db.withServiceContext(async (client) => {
      const { rows } = await client.query(
        `SELECT id, auth0_user_id, status, total_cents, currency, created_at
         FROM orders ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      return rows;
    });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/customers — derived from orders, grouped by buyer.
// There's no separate "customers" table — Auth0 owns profile data (name,
// email), and looking that up per-user here would mean an Auth0 Management
// API call per row. This gives real purchasing behavior per customer id;
// wire in Management API lookups if you need name/email alongside it.
router.get('/customers', async (req, res, next) => {
  try {
    const rows = await db.withServiceContext(async (client) => {
      const { rows } = await client.query(`
        SELECT auth0_user_id,
               COUNT(*) AS order_count,
               SUM(total_cents) FILTER (WHERE status = 'paid') AS total_spent_cents,
               MAX(created_at) AS last_order_at
        FROM orders
        GROUP BY auth0_user_id
        ORDER BY total_spent_cents DESC NULLS LAST
        LIMIT 100
      `);
      return rows.map((r) => ({
        auth0UserId: r.auth0_user_id,
        orderCount: Number(r.order_count),
        totalSpentCents: Number(r.total_spent_cents || 0),
        lastOrderAt: r.last_order_at,
      }));
    });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
