const db = require('../config/db');

// Call only with a signature-verified event or a server-retrieved Stripe session.
async function completePayment(session) {
  if (!['paid','no_payment_required'].includes(session.payment_status)) return;
  return db.withServiceContext(async client => {
        const {rows:[order]} = await client.query('SELECT * FROM orders WHERE stripe_session_id = $1 FOR UPDATE',[session.id]);
        // Another app can share this Stripe account; never update unmatched orders.
        if (!order) {console.warn('Webhook session has no local order:',session.id);return;}
        if (order.status !== 'pending') return;
        if (session.amount_total !== order.total_cents || session.currency !== order.currency) throw new Error('Payment amount/currency mismatch');
        const { rows: items } = await client.query(
          `SELECT product_id, SUM(quantity)::integer AS quantity
           FROM order_items WHERE order_id = $1 GROUP BY product_id ORDER BY product_id`,
          [order.id]
        );
        if (!items.length) throw new Error(`Order ${order.id}: no visible order items; check data and RLS`);
        // Stable product order reduces deadlocks between concurrent checkouts.
        // A failed update throws so withServiceContext rolls back ALL stock changes.
        for (const item of items) {
          const result = await client.query(
            `UPDATE products SET stock = stock - $2
             WHERE id = $1 AND stock >= $2 RETURNING id, stock`,
            [item.product_id, item.quantity]
          );
          if (result.rowCount !== 1) {
            throw new Error(`Order ${order.id}: stock update failed for product ${item.product_id}; check stock and RLS`);
          }
        }
        const updated = await client.query(
          "UPDATE orders SET status = 'paid' WHERE id = $1 AND status = 'pending' RETURNING id", [order.id]
        );
        if (updated.rowCount !== 1) throw new Error(`Order ${order.id}: paid update failed`);
      });
}
module.exports = completePayment;
