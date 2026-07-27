// Verifies the Auth0-issued JWT sent in the Authorization: Bearer <token> header.
// This is how we know a request is really from a logged-in user, without ever
// touching a password ourselves — Auth0 handles login, hashing, MFA, etc.

const { auth } = require('express-oauth2-jwt-bearer');

const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  tokenSigningAlg: 'RS256',
});

module.exports = checkJwt;
