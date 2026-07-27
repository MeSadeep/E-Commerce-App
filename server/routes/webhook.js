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
        await client.query(`UPDATE orders SET status = 'paid' WHERE stripe_session_id = $1`, [
          session.id,
        ]);
      });
    } catch (err) {
      console.error('Failed to update order after payment:', err);
      // Still return 200 so Stripe doesn't endlessly retry; log for manual follow-up.
    }
  }

  res.json({ received: true });
});

module.exports = router;
