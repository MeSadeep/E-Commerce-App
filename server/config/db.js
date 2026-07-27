// PostgreSQL connection pool.
// We use parameterized queries everywhere (see routes/*.js) — never string-concatenate
// user input into SQL. That's what prevents SQL injection.
//
// This app connects as a LOW-PRIVILEGE role (app_user — see db/schema.sql),
// never as a superuser or table owner, so that Row Level Security (RLS)
// policies actually get enforced by Postgres itself and can't be silently
// bypassed.

const { Pool } = require('pg');

const useSSL = process.env.PG_SSL === 'true';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error on idle client', err);
});

// Runs `work(client)` inside a transaction with app.current_user_id set for
// that transaction only (set_config(..., true) unwinds itself at
// COMMIT/ROLLBACK). The RLS policies on orders/order_items check this value,
// so a query can only ever see or modify that one user's own rows — even if
// a route handler forgets a WHERE clause.
async function withUserContext(auth0UserId, work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [auth0UserId]);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// For the small number of trusted, server-only operations that aren't tied
// to one browser user — currently just the Stripe webhook, which is already
// authenticated via signature verification (see routes/webhook.js) rather
// than a user session.
async function withServiceContext(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.is_service', 'true', true)");
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  // Plain query — fine for public, unscoped data (e.g. reading the product catalog)
  query: (text, params) => pool.query(text, params),
  pool,
  withUserContext,
  withServiceContext,
};
