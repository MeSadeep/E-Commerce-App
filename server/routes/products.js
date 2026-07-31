const express = require('express');
const { param, query, validationResult } = require('express-validator');
const db = require('../config/db');
const redis = require('../config/redis');

const router = express.Router();
const LIST_CACHE_KEY = 'products:list';
const LIST_CACHE_TTL_SECONDS = 60; // short TTL — catalog changes rarely, but stays fresh within a minute

// Whitelisted sort options — never interpolate a client-supplied sort string
// directly into SQL (that would be a SQL injection vector). Map a small,
// known set of names to safe, fixed ORDER BY clauses instead.
const SORT_OPTIONS = {
  newest: 'id DESC',
  price_asc: 'price_cents ASC',
  price_desc: 'price_cents DESC',
  name_asc: 'name ASC',
};

// GET /api/products
// Supports, all combinable:
//   ?search=lamp            case-insensitive name search
//   ?category=Electronics   exact category match
//   ?min_price=10&max_price=50   dollars (converted to cents here)
//   ?sort=price_asc         see SORT_OPTIONS above; defaults to "newest"
// Only ever returns is_active products — a "deleted" product (soft-deleted
// because it has real order history, see routes/admin.js) stays hidden from
// the storefront without breaking the order rows that reference it.
// The Redis cache only ever serves the plain, unfiltered, default-sorted
// list — any filter/search/sort bypasses it and queries directly, since
// caching every possible filter combination isn't worth the complexity here.
router.get(
  '/',
  [
    query('min_price').optional().isFloat({ min: 0 }).withMessage('min_price must be a non-negative number'),
    query('max_price').optional().isFloat({ min: 0 }).withMessage('max_price must be a non-negative number'),
    query('sort').optional().isIn(Object.keys(SORT_OPTIONS)).withMessage('Invalid sort option'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const minPrice = req.query.min_price !== undefined ? Math.round(Number(req.query.min_price) * 100) : null;
    const maxPrice = req.query.max_price !== undefined ? Math.round(Number(req.query.max_price) * 100) : null;
    const sort = SORT_OPTIONS[req.query.sort] || SORT_OPTIONS.newest;
    const hasFilters = search || category || minPrice !== null || maxPrice !== null || req.query.sort;

    try {
      if (!hasFilters && redis) {
        const cached = await redis.get(LIST_CACHE_KEY).catch(() => null);
        if (cached) {
          res.set('X-Cache', 'HIT');
          return res.json(JSON.parse(cached));
        }
      }

      const conditions = ['is_active = true'];
      const values = [];

      if (search) {
        values.push(`%${search}%`);
        conditions.push(`name ILIKE $${values.length}`);
      }
      if (category) {
        values.push(category);
        conditions.push(`category = $${values.length}`);
      }
      if (minPrice !== null) {
        values.push(minPrice);
        conditions.push(`price_cents >= $${values.length}`);
      }
      if (maxPrice !== null) {
        values.push(maxPrice);
        conditions.push(`price_cents <= $${values.length}`);
      }

      const result = await db.query(
        `SELECT id, name, description, category, price_cents, currency, image_url, stock
         FROM products
         WHERE ${conditions.join(' AND ')}
         ORDER BY ${sort}`,
        values
      );

      if (!hasFilters && redis) {
        redis.set(LIST_CACHE_KEY, JSON.stringify(result.rows), 'EX', LIST_CACHE_TTL_SECONDS).catch((err) =>
          console.error('Redis set failed (non-fatal):', err.message)
        );
      }

      res.set('X-Cache', hasFilters ? 'BYPASS' : redis ? 'MISS' : 'DISABLED');
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/products/categories - distinct category list, for populating the
// Shop page's filter dropdown. Only counts categories that have at least one
// active product, so the filter never offers an option with zero results.
router.get('/categories', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT category FROM products
       WHERE is_active = true AND category IS NOT NULL
       ORDER BY category ASC`
    );
    res.json(result.rows.map((r) => r.category));
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id - single product (public). Returns 404 for a
// soft-deleted (is_active = false) product too, same as if it never existed.
router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('id must be a positive integer')],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const result = await db.query(
        'SELECT id, name, description, category, price_cents, currency, image_url, stock FROM products WHERE id = $1 AND is_active = true',
        [req.params.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/products/:id/variants - size/color/material variants for a product
router.get(
  '/:id/variants',
  [param('id').isInt({ min: 1 }).withMessage('id must be a positive integer')],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const result = await db.query(
        `SELECT id, size, color, material, image_url, image_urls, price_cents, stock
         FROM product_variants WHERE product_id = $1 ORDER BY id ASC`,
        [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  }
);

// Call this whenever products change (admin create/update/delete) so the
// cache doesn't serve stale data for up to a minute.
async function invalidateProductsCache() {
  if (redis) {
    await redis.del(LIST_CACHE_KEY).catch((err) => console.error('Redis del failed:', err.message));
  }
}

module.exports = router;
module.exports.invalidateProductsCache = invalidateProductsCache;
