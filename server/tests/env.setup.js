// Runs before any test file. Provides harmless placeholder values so modules
// like Stripe/Auth0 don't throw on import when CI has no real secrets
// configured. Never used for anything that actually talks to a real service —
// the tests in this repo don't exercise Stripe/Auth0/DB network calls.
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_placeholder';
process.env.AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'https://test-audience';
process.env.AUTH0_ISSUER_BASE_URL = process.env.AUTH0_ISSUER_BASE_URL || 'https://test-tenant.us.auth0.com/';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/test_placeholder';
