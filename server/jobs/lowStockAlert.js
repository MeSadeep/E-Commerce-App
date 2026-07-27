const cron = require('node-cron');
const db = require('../config/db');

const THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD, 10) || 5;

// Runs every day at 08:00 server time. Currently just logs — wire this up to
// an email (e.g. via Resend/SendGrid) or a Slack webhook once you have one
// configured; the query and schedule are the part that's ready to go.
function startLowStockJob() {
  cron.schedule('0 8 * * *', async () => {
    try {
      const { rows } = await db.query(
        'SELECT id, name, stock FROM products WHERE stock < $1 ORDER BY stock ASC',
        [THRESHOLD]
      );
      if (rows.length > 0) {
        console.warn(`[low-stock] ${rows.length} product(s) below threshold (${THRESHOLD}):`, rows);
        // TODO: send an email/Slack alert here instead of just logging.
      }
    } catch (err) {
      console.error('[low-stock] job failed:', err);
    }
  });
}

module.exports = { startLowStockJob };
