const express = require('express');
const Stripe = require('stripe');
const db = require('../config/db');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// POST /webhook
// This is the ONLY source of truth for "did the payment actually succeed".
// Stripe signs every webhook request, and we verify that signature below —
// this stops anyone from faking a "payment succeeded" call to our server.
//
// IMPORTANT: this route needs the raw request body (not JSON-parsed) to verify
// the signature, so in server.js it's mounted BEFORE express.json().
//
// This handler updates an order that doesn't belong to "the current browser
// user" (Stripe is calling us, not a logged-in user) — so it runs inside
// db.withServiceContext(), the one trusted server-only RLS path, instead of
// withUserContext(). Trust here comes from the signature check above, not
// from a user session.
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      await db.withServiceContext(async (client) => {
        // WHERE ... AND status != 'paid' is the actual idempotency guard:
        // Stripe explicitly documents that it can redeliver the same webhook
        // event more than once. Without this condition, a redelivered event
        // for an order already marked 'paid' would match again and the stock
        // decrement below would run a second time for the same purchase.
        // With it, a redelivery finds zero rows and the block below is
        // skipped entirely.
        const orderResult = await client.query(
          `UPDATE orders SET status = 'paid'
           WHERE stripe_session_id = $1 AND status != 'paid'
           RETURNING id`,
          [session.id]
        );

        if (orderResult.rows.length === 0) return; // already processed, or session_id not found
        const orderId = orderResult.rows[0].id;

        // Decrement stock for exactly what was purchased. This was a real
        // gap: checkout only ever *checked* stock at session-creation time
        // but never *decremented* it on confirmed payment, so the site
        // could oversell an item that's actually sold out. GREATEST(...,0)
        // stops stock from going negative if stock was separately adjusted
        // in the admin panel in the meantime.
        await client.query(
          `UPDATE products p
           SET stock = GREATEST(p.stock - oi.quantity, 0)
           FROM order_items oi
           WHERE oi.order_id = $1 AND oi.product_id = p.id`,
          [orderId]
        );
      });
    } catch (err) {
      console.error('Failed to update order after payment:', err);
      // Still return 200 so Stripe doesn't endlessly retry; log for manual follow-up.
    }
  }

  res.json({ received: true });
});

module.exports = router;
