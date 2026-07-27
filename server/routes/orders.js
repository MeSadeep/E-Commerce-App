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

module.exports = router;
