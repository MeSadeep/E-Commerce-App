const express = require('express');
const { body, validationResult } = require('express-validator');
const { parse } = require('csv-parse/sync');
const db = require('../config/db');
const checkJwt = require('../middleware/checkJwt');
const { requireRole } = require('../middleware/requireRole');
const { invalidateProductsCache } = require('./products');

const router = express.Router();

// Every route below requires: valid Auth0 login AND the "admin" role claim.
router.use(checkJwt, requireRole('admin'));

// GET /api/admin/products - unlike the public listing, this includes
// soft-deleted (is_active = false) products too, so the admin panel can
// still find and reactivate them.
router.get('/products', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, description, category, price_cents, currency, image_url, stock, is_active FROM products ORDER BY id ASC'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/products - create a product
router.post(
  '/products',
  [
    body('name').isString().trim().isLength({ min: 1, max: 255 }),
    body('description').optional().isString().trim(),
    body('category').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }),
    body('price_cents').isInt({ min: 0 }),
    body('currency').optional().isString().isLength({ min: 3, max: 3 }),
    body('image_url').optional().isURL(),
    body('stock').isInt({ min: 0 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, description, category, price_cents, currency = 'usd', image_url, stock } = req.body;
      const result = await db.withServiceContext(async (client) => {
        const { rows } = await client.query(
          `INSERT INTO products (name, description, category, price_cents, currency, image_url, stock)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [name, description || null, category || null, price_cents, currency, image_url || null, stock]
        );
        return rows[0];
      });
      await invalidateProductsCache();
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/admin/products/:id - update a product (e.g. price, stock, category)
router.patch(
  '/products/:id',
  [
    body('name').optional().isString().trim().isLength({ min: 1, max: 255 }),
    body('category').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }),
    body('price_cents').optional().isInt({ min: 0 }),
    body('stock').optional().isInt({ min: 0 }),
    body('image_url').optional().isURL(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const allowedFields = ['name', 'description', 'category', 'price_cents', 'currency', 'image_url', 'stock', 'is_active'];
    const updates = Object.keys(req.body).filter((k) => allowedFields.includes(k));
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    try {
      const setClause = updates.map((field, i) => `${field} = $${i + 1}`).join(', ');
      const values = updates.map((field) => req.body[field]);
      const result = await db.withServiceContext(async (client) => {
        const { rows } = await client.query(
          `UPDATE products SET ${setClause} WHERE id = $${updates.length + 1} RETURNING *`,
          [...values, req.params.id]
        );
        return rows[0];
      });
      if (!result) return res.status(404).json({ error: 'Product not found' });
      await invalidateProductsCache();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/products/bulk-stock - CSV upload: columns "id,stock"
router.post('/products/bulk-stock', [body('csv').isString().isLength({ min: 1 })], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const records = parse(req.body.csv, { columns: true, skip_empty_lines: true, trim: true });
    const updated = [];

    await db.withServiceContext(async (client) => {
      for (const row of records) {
        const id = parseInt(row.id, 10);
        const stock = parseInt(row.stock, 10);
        if (!Number.isInteger(id) || !Number.isInteger(stock) || stock < 0) continue; // skip malformed rows
        await client.query('UPDATE products SET stock = $1 WHERE id = $2', [stock, id]);
        updated.push({ id, stock });
      }
    });

    await invalidateProductsCache();
    res.json({ updatedCount: updated.length, updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/products/:id
// A product that has ever actually been ordered can't be hard-deleted —
// order_items.product_id references it, and removing the row would either
// fail or silently corrupt that order's history. So: try a real delete
// first (fine for a product nobody's ever bought), and if Postgres rejects
// it with a foreign-key-violation (error code 23503), fall back to
// soft-delete — the product stops appearing in the storefront, but its row
// (and the orders pointing at it) stay intact.
router.delete('/products/:id', async (req, res, next) => {
  try {
    const hardDeleted = await db.withServiceContext(async (client) => {
      try {
        const { rowCount } = await client.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        return rowCount > 0;
      } catch (err) {
        if (err.code === '23503') return null; // signal "needs soft delete" to the outer scope
        throw err;
      }
    });

    if (hardDeleted === null) {
      const { rows } = await db.withServiceContext(async (client) => {
        return client.query(
          'UPDATE products SET is_active = false WHERE id = $1 RETURNING id, name',
          [req.params.id]
        );
      });
      if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
      await invalidateProductsCache();
      return res.json({
        softDeleted: true,
        message: `"${rows[0].name}" has past orders, so it was hidden from the store instead of deleted (deleting it would break those order records).`,
      });
    }

    await invalidateProductsCache();
    if (!hardDeleted) return res.status(404).json({ error: 'Product not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/low-stock?threshold=5
router.get('/low-stock', async (req, res, next) => {
  const threshold = parseInt(req.query.threshold, 10) || 5;
  try {
    const { rows } = await db.query(
      'SELECT id, name, stock FROM products WHERE stock < $1 ORDER BY stock ASC',
      [threshold]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// --- Product variants (color/size/material options, each with up to 4 photos) ---

// GET /api/admin/products/:productId/variants
router.get('/products/:productId/variants', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, product_id, size, color, material, image_url, image_urls, price_cents, stock
       FROM product_variants WHERE product_id = $1 ORDER BY id ASC`,
      [req.params.productId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/products/:productId/variants
router.post(
  '/products/:productId/variants',
  [
    body('size').optional({ values: 'falsy' }).isString().trim().isLength({ max: 50 }),
    body('color').optional({ values: 'falsy' }).isString().trim().isLength({ max: 50 }),
    body('material').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }),
    body('image_urls').optional().isArray({ max: 4 }).withMessage('Up to 4 images allowed'),
    body('image_urls.*').optional({ values: 'falsy' }).isURL(),
    body('price_cents').isInt({ min: 0 }),
    body('stock').isInt({ min: 0 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { size, color, material, price_cents, stock } = req.body;
      const imageUrls = (req.body.image_urls || []).filter(Boolean).slice(0, 4);

      const result = await db.withServiceContext(async (client) => {
        const parent = await client.query('SELECT id FROM products WHERE id = $1', [req.params.productId]);
        if (parent.rows.length === 0) return null;

        const { rows } = await client.query(
          `INSERT INTO product_variants (product_id, size, color, material, image_url, image_urls, price_cents, stock)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [req.params.productId, size || null, color || null, material || null, imageUrls[0] || null, JSON.stringify(imageUrls), price_cents, stock]
        );
        return rows[0];
      });

      if (!result) return res.status(404).json({ error: 'Product not found' });
      await invalidateProductsCache();
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/admin/variants/:id
router.patch(
  '/variants/:id',
  [
    body('size').optional({ values: 'falsy' }).isString().trim().isLength({ max: 50 }),
    body('color').optional({ values: 'falsy' }).isString().trim().isLength({ max: 50 }),
    body('material').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }),
    body('image_urls').optional().isArray({ max: 4 }).withMessage('Up to 4 images allowed'),
    body('image_urls.*').optional({ values: 'falsy' }).isURL(),
    body('price_cents').optional().isInt({ min: 0 }),
    body('stock').optional().isInt({ min: 0 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const allowedFields = ['size', 'color', 'material', 'image_urls', 'price_cents', 'stock'];
    const updates = Object.keys(req.body).filter((k) => allowedFields.includes(k));
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    try {
      const fieldsToSet = [...updates];
      if (updates.includes('image_urls') && !fieldsToSet.includes('image_url')) {
        fieldsToSet.push('image_url');
      }

      const setClause = fieldsToSet.map((field, i) => `${field} = $${i + 1}`).join(', ');
      const values = fieldsToSet.map((field) => {
        if (field === 'image_urls') {
          const cleaned = (req.body.image_urls || []).filter(Boolean).slice(0, 4);
          return JSON.stringify(cleaned);
        }
        if (field === 'image_url') {
          const cleaned = (req.body.image_urls || []).filter(Boolean).slice(0, 4);
          return cleaned[0] || null;
        }
        return req.body[field];
      });

      const result = await db.withServiceContext(async (client) => {
        const { rows } = await client.query(
          `UPDATE product_variants SET ${setClause} WHERE id = $${fieldsToSet.length + 1} RETURNING *`,
          [...values, req.params.id]
        );
        return rows[0];
      });
      if (!result) return res.status(404).json({ error: 'Variant not found' });
      await invalidateProductsCache();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/admin/variants/:id
// Unlike products, variants aren't (yet) referenced by order_items directly
// — checkout today only tracks the base product — so a hard delete is safe.
router.delete('/variants/:id', async (req, res, next) => {
  try {
    const { rowCount } = await db.withServiceContext(async (client) => {
      return client.query('DELETE FROM product_variants WHERE id = $1', [req.params.id]);
    });
    if (rowCount === 0) return res.status(404).json({ error: 'Variant not found' });
    await invalidateProductsCache();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// NOTE: /orders and /customers deliberately live in routes/dashboard.js, not
// here — keeping one canonical version avoids two routers both claiming
// "/api/admin/orders" and silently shadowing each other depending on mount
// order (Express uses whichever router was app.use()'d first).

module.exports = router;
