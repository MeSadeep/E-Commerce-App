// Minimal smoke tests — enough to give the CI pipeline something real to
// run and fail on. Expand this over time (checkout validation, RBAC checks,
// etc.) as the app grows.
const request = require('supertest');

// These tests only exercise routes that don't need a live database/Auth0/Stripe
// connection, so they can run in CI without any secrets configured.
describe('GET /health', () => {
  it('returns status ok', async () => {
    const app = require('../server');
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('Auth-protected routes reject requests with no token', () => {
  it('GET /api/orders returns 401 without a token', async () => {
    const app = require('../server');
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });

  it('POST /api/checkout/create-session returns 401 without a token', async () => {
    const app = require('../server');
    const res = await request(app).post('/api/checkout/create-session').send({ items: [] });
    expect(res.status).toBe(401);
  });
});
