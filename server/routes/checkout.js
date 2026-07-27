const express = require('express');
const Stripe = require('stripe');
const db = require('../config/db');
const checkJwt = require('../middleware/checkJwt');
const { validateCheckoutBody } = require('../middleware/validators');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// POST /api/checkout/create-session
// Protected: user must be logged in via Auth0 (checkJwt).
// The frontend only ever sends { productId, quantity } — NEVER a price.
// We look up the real, current price from our own database, so a user can't
// tamper with the request (e.g. via devtools) to pay less than the real price.
//
// The order + order_items writes run inside db.withUserContext(), which sets
// the RLS session variable for this user. Even if this route had a bug and
// tried to write auth0_user_id for someone else, Postgres's RLS policy
// (WITH CHECK on the orders table) would reject the write outright.
router.post('/create-session', checkJwt, validateCheckoutBody, async (req, res, next) => {
  try {
    const { items } = req.body;
    const auth0UserId = req.auth.payload.sub; // trusted identity from the verified JWT

    const productIds = items.map((i) => i.productId);
    const { rows: products } = await db.query(
      'SELECT id, name, price_cents, currency, stock FROM products WHERE id = ANY($1::int[])',
      [productIds]
    );

    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'One or more products do not exist' });
    }

    const line_items = [];
    let total_cents = 0;
    const orderItemsForDb = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (item.quantity > product.stock) {
        return res.status(400).json({ error: `Not enough stock for ${product.name}` });
      }
      line_items.push({
        price_data: {
          currency: product.currency,
          product_data: { name: product.name },
          unit_amount: product.price_cents,
        },
        quantity: item.quantity,
      });
      total_cents += product.price_cents * item.quantity;
      orderItemsForDb.push({
        productId: product.id,
        quantity: item.quantity,
        unitPriceCents: product.price_cents,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      success_url: `${process.env.CLIENT_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/order-cancelled`,
      metadata: { auth0UserId },
    });

    // Record the order as "pending" now; the webhook flips it to "paid"
    // once Stripe actually confirms the charge — we never trust the browser
    // redirect alone to decide an order was paid for.
    await db.withUserContext(auth0UserId, async (client) => {
      const orderResult = await client.query(
        `INSERT INTO orders (auth0_user_id, stripe_session_id, status, total_cents, currency)
         VALUES ($1, $2, 'pending', $3, $4) RETURNING id`,
        [auth0UserId, session.id, total_cents, products[0].currency]
      );
      const orderId = orderResult.rows[0].id;

      for (const oi of orderItemsForDb) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
           VALUES ($1, $2, $3, $4)`,
          [orderId, oi.productId, oi.quantity, oi.unitPriceCents]
        );
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
