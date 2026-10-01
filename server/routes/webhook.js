const express = require('express');
const Stripe = require('stripe');
const completePayment = require('../services/completePayment');
const { invalidateProductsCache } = require('./products');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// POST /webhook
// Payment is verified by signed webhooks or the server-side recovery script.
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
      await completePayment(session);
      // Only invalidate after COMMIT; retries also clear any stale cached list.
      await invalidateProductsCache();
    } catch(err) {
      console.error('Failed to update order after payment:',err);
      return res.status(500).json({error:'Payment processing failed; retry required'});
    }
  }
  res.json({received:true});
});
module.exports = router;
