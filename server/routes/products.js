const express = require('express');
const { param, validationResult } = require('express-validator');
const db = require('../config/db');
const redis = require('../config/redis');

const router = express.Router();
const LIST_CACHE_KEY = 'products:list';
const LIST_CACHE_TTL_SECONDS = 60; // short TTL — catalog changes rarely, but stays fresh within a minute

// GET /api/products - public product listing (cached in Redis when available)
// GET /api/products?search=lamp - case-insensitive name search, bypasses the
// cache (which only holds the full unfiltered list) and queries directly.
// Only ever returns is_active products — a "deleted" product (soft-deleted
// because it has real order history, see routes/admin.js) stays hidden from
// the storefront without breaking the order rows that reference it.
router.get('/', async (req, res, next) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  try {
    if (search) {
      const result = await db.query(
        `SELECT id, name, description, price_cents, currency, image_url, stock
         FROM products WHERE is_active = true AND name ILIKE $1 ORDER BY id ASC`,
        [`%${search}%`]
      );
      return res.json(result.rows);
    }

    if (redis) {
      const cached = await redis.get(LIST_CACHE_KEY).catch(() => null);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }
    }

    const result = await db.query(
      'SELECT id, name, description, price_cents, currency, image_url, stock FROM products WHERE is_active = true ORDER BY id ASC'
    );

    if (redis) {
      redis.set(LIST_CACHE_KEY, JSON.stringify(result.rows), 'EX', LIST_CACHE_TTL_SECONDS).catch((err) =>
        console.error('Redis set failed (non-fatal):', err.message)
      );
    }

    res.set('X-Cache', redis ? 'MISS' : 'DISABLED');
    res.json(result.rows);
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
        'SELECT id, name, description, price_cents, currency, image_url, stock FROM products WHERE id = $1 AND is_active = true',
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
