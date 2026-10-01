const express = require('express');
const request = require('supertest');
jest.mock('../middleware/checkJwt', () => (req,res,next) => next());
jest.mock('../middleware/requireRole', () => ({requireRole: () => (req,res,next) => next()}));
jest.mock('../config/db', () => ({query: jest.fn(), withServiceContext: jest.fn()}));
const db = require('../config/db');
const app = express();
app.use('/api/admin/analytics', require('../routes/analytics'));
app.use((err,req,res,next) => res.status(500).json({error:err.message}));
test.each(['/sales','/conversion','/abandoned-carts'])('%s uses the scoped connection', async route => {
  const query = jest.fn().mockResolvedValue({rows: route === '/conversion' ? [{paid_count:'1',total_count:'4'}] : []});
  db.withServiceContext.mockImplementation(work => work({query}));
  const response = await request(app).get('/api/admin/analytics'+route);
  expect(response.status).toBe(200);
  expect(query).toHaveBeenCalledTimes(1);
  expect(db.query).not.toHaveBeenCalled();
});
