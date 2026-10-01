// Run from server: node scripts/reconcile-payments.js [--apply]
require('dotenv').config({path:require('path').join(__dirname,'../.env')});
const Stripe = require('stripe');
const db = require('../config/db');
const completePayment = require('../services/completePayment');
const {invalidateProductsCache} = require('../routes/products');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY,{timeout:15000,maxNetworkRetries:1});
const apply = process.argv.includes('--apply');
async function main() {
  if(process.argv.slice(2).some(arg=>arg!=='--apply')) throw new Error('Usage: node scripts/reconcile-payments.js [--apply]');
  console.log(apply ? 'APPLY: verified pending orders will be processed.' : 'PREVIEW ONLY: no database writes.');
  const orders = await db.withServiceContext(async client => (await client.query(
    "SELECT id, stripe_session_id, total_cents, currency FROM orders WHERE status = 'pending' ORDER BY id"
  )).rows);
  for(const order of orders) {
    try {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id,{
        expand:['payment_intent.latest_charge']
      });
      const intent=session.payment_intent;
      const charge=intent?.latest_charge;
      if(session.payment_status !== 'paid' || session.status !== 'complete') {
        console.log(`#${order.id}: SKIP ${session.status}/${session.payment_status}`); continue;
      }
      if(session.amount_total !== order.total_cents || session.currency !== order.currency) throw new Error('Amount/currency mismatch');
      // Historical payments can have been refunded or disputed since checkout.
      if(!intent || typeof intent !== 'object' || intent.status !== 'succeeded' || !charge || typeof charge !== 'object') throw new Error('Cannot verify latest charge; manual review needed');
      if(charge.refunded || charge.amount_refunded > 0 || charge.disputed) throw new Error('Refunded or disputed payment; manual review needed');
      if(apply) {
        await completePayment(session);
        await invalidateProductsCache();
        console.log(`#${order.id}: processed (already-final orders are skipped under lock)`);
      } else console.log(`#${order.id}: VERIFIED PAID; apply will attempt stock deduction + paid update`);
    } catch(err) {
      console.error(`#${order.id}: NOT UPDATED: ${err.message}`);
      process.exitCode=1;
    }
  }
}
main().catch(err=>{console.error(err.message);process.exitCode=1;}).finally(async()=>{
  await db.pool.end();
  const redis=require('../config/redis');
  if(redis) redis.disconnect();
});
