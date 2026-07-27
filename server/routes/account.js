const express = require('express');
const db = require('../config/db');
const checkJwt = require('../middleware/checkJwt');

const router = express.Router();

// One-time setup needed in Auth0 for this route to work (dashboard only):
// 1. Auth0 Dashboard -> Applications -> Create Application -> "Machine to Machine"
// 2. Authorize it for the "Auth0 Management API", grant the "delete:users" scope
// 3. Copy its Client ID/Secret into server/.env as AUTH0_M2M_CLIENT_ID / AUTH0_M2M_CLIENT_SECRET
async function getManagementApiToken() {
  const resp = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.AUTH0_M2M_CLIENT_ID,
      client_secret: process.env.AUTH0_M2M_CLIENT_SECRET,
      audience: `${process.env.AUTH0_ISSUER_BASE_URL}api/v2/`,
      grant_type: 'client_credentials',
    }),
  });
  if (!resp.ok) throw new Error('Failed to get Auth0 Management API token');
  const data = await resp.json();
  return data.access_token;
}

// DELETE /api/account
// GDPR "right to erasure". We anonymize orders rather than hard-deleting them
// (many countries legally require keeping financial/tax records for several
// years), but we do delete the Auth0 identity itself and detach it from those
// records — the user's personal data no longer resolves to a real identity.
router.delete('/', checkJwt, async (req, res, next) => {
  try {
    const auth0UserId = req.auth.payload.sub;

    // Note: this uses withServiceContext (not withUserContext) because the
    // UPDATE rewrites auth0_user_id to a different value — the RLS policy's
    // WITH CHECK would reject that under the user's own context, since the
    // resulting row would no longer belong to them. This is the one
    // legitimate case where anonymization needs the trusted server path.
    await db.withServiceContext(async (client) => {
      await client.query(
        `UPDATE orders SET auth0_user_id = 'deleted-user' WHERE auth0_user_id = $1`,
        [auth0UserId]
      );
    });

    // Delete the actual Auth0 user record (name, email, login credentials, etc.)
    const mgmtToken = await getManagementApiToken();
    const deleteResp = await fetch(
      `${process.env.AUTH0_ISSUER_BASE_URL}api/v2/users/${encodeURIComponent(auth0UserId)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${mgmtToken}` } }
    );
    if (!deleteResp.ok && deleteResp.status !== 404) {
      throw new Error(`Auth0 user deletion failed: ${deleteResp.status}`);
    }

    res.json({ message: 'Account and personal data deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
