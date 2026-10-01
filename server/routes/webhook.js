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

  if (['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)) {
    const session = event.data.object;
    if (!['paid','no_payment_required'].includes(session.payment_status)) return res.json({received:true});
    try {
      await db.withServiceContext(async client => {
        const {rows:[order]} = await client.query('SELECT * FROM orders WHERE stripe_session_id = $1 FOR UPDATE',[session.id]);
        // Another app can share this Stripe account; never update unmatched orders.
        if (!order) {console.warn('Webhook session has no local order:',session.id);return;}
        if (order.status !== 'pending') return;
        if (session.amount_total !== order.total_cents || session.currency !== order.currency) throw new Error('Payment amount/currency mismatch');
        await client.query("UPDATE orders SET status = 'paid' WHERE id = $1 AND status = 'pending'",[order.id]);
        await client.query(`UPDATE products p SET stock = GREATEST(p.stock - oi.quantity,0)
          FROM order_items oi WHERE oi.order_id = $1 AND oi.product_id = p.id`,[order.id]);
      });
    } catch(err) {
      console.error('Failed to update order after payment:',err);
      return res.status(500).json({error:'Payment processing failed; retry required'});
    }
  }
  res.json({received:true});
});
module.exports = router;
